from dotenv import load_dotenv
import os

# Charger le .env EN PREMIER, avant tout import de module local,
# pour que os.getenv() soit disponible dès l'initialisation des modules.
# override=True: le .env du projet doit primer sur les variables User/Machine Windows.
load_dotenv(override=True)

from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS
import glob
import json
import re
import requests
import threading
import uuid
from io import BytesIO
from zipfile import ZipFile
from datetime import datetime
from jinja2 import Template
from A1.generate_talent import generate_talent_card
from A1.insert_data import insert_talent_card, generate_unique_id_agent, create_candidate_record
from A1.talent_html import generate_and_save_talent_card_html
from A1.ocr import ocr_pdf_bytes, ocr_image_bytes, extract_text_from_pdf_bytes, extract_text_from_image_bytes
from A1.extract_image import extract_top_image_from_bytes
from B1.generate_corrected_cv import (
    generate_corrected_cv as generate_corrected_cv_agent2,
    transform_corrected_json_to_cv_context,
    render_cv_html,
)
from supabase_storage import get_supabase_storage
from supabase_db import supabase_db
from candidate_minio_path import get_candidate_minio_prefix, normalize_categorie_profil
from B3.interview_routes import interview_bp, cleanup_old_sessions
from B3.avatar_routes import avatar_api_bp
from auth import auth_bp, oauth_bp, get_optional_user_from_request
from A2.agent_scoring_v2 import AgentScoringV2
from A2.module_A2_Bis.A2_bis_dynamic_agent import A2BisDynamicAgent
from services.embedding_service import (
    generer_embedding,
    calculer_similarite,
    embedding_to_json,
    parse_embedding,
)

app = Flask(__name__)
# Autoriser l'en-tête Authorization pour les requêtes cross-origin (login puis GET /auth/me/files)


CORS(
    app,
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Cache-Control",
        "Pragma",
    ],
    supports_credentials=True,
)


# Enregistrer le blueprint de l'entretien
app.register_blueprint(interview_bp)
# API Avatar (TTS playbook) - mêmes routes que le backend FastAPI avatar
app.register_blueprint(avatar_api_bp)
# Authentification (inscription / connexion)
app.register_blueprint(auth_bp)
# OAuth social (Google / GitHub / LinkedIn)
app.register_blueprint(oauth_bp)


# Template CV : HTML A4 (Jinja2) — utilisé par défaut pour la génération du CV corrigé
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)

DEFAULT_CORRECTED_HTML_TEMPLATE = os.path.join(_PROJECT_ROOT, "frontend", "src", "20260312_044613", "CV_template_A4.html")
# Chemins de fallback (Docker / volume)
CV_HTML_TEMPLATE_PATHS = [
    "/app/frontend/src/20260312_044613/CV_template_A4.html",
    "/frontend/src/20260312_044613/CV_template_A4.html",
    DEFAULT_CORRECTED_HTML_TEMPLATE,
]

# Timestamp de dernière génération du PDF portfolio par (db_candidate_id, version) — pour que la prévisualisation affiche le nouveau PDF après régénération
import time as _time
import threading as _threading
_portfolio_pdf_generated_at = {}
_portfolio_pdf_lock = _threading.Lock()  # thread-safe pour accès multi-workers
_portfolio_pdf_jobs_in_progress = set()  # (db_candidate_id, version, lang)


def _load_talentcard_from_db(db_candidate_id):
    """
    Construit la Talent Card à partir de la base de données (Supabase),
    puis tente de la compléter avec la version JSON générée par l'agent A1
    stockée dans le stockage de fichiers (anciennement MinIO, maintenant Supabase Storage via adapter).
    """
    if supabase_db is None:
        print("⚠️  Supabase DB non configuré pour _load_talentcard_from_db")
        return None

    try:
        resp = (
            supabase_db.table("candidates")
            .select("*")
            .eq("id", db_candidate_id)
            .limit(1)
            .execute()
        )
        candidate = resp.data[0] if resp.data else None
    except Exception as e:
        print(f"❌ Erreur Supabase lors du chargement du candidat {db_candidate_id}: {e}")
        candidate = None

    if not candidate:
        return None

    # Données de base depuis la table candidates
    talentcard_data = {
        "id_agent": candidate.get("id_agent"),
        "nom": candidate.get("nom") or "",
        "prenom": candidate.get("prenom") or "",
        "Titre de profil": candidate.get("titre_profil") or "",
        "ville": candidate.get("ville") or "",
        "pays": candidate.get("pays") or "",
        "linkedin": candidate.get("linkedin") or "",
        "email": candidate.get("email") or "",
        "phone": candidate.get("phone") or "",
        "annees_experience": candidate.get("annees_experience"),
        "disponibilite": candidate.get("disponibilite") or "",
        "pret_a_relocater": candidate.get("pret_a_relocater") or "",
        "niveau_seniorite": candidate.get("niveau_seniorite") or "",
        "pays_cible": candidate.get("pays_cible") or candidate.get("target_country") or "",
        "salaire_minimum": candidate.get("salaire_minimum") or "",
        "resume_bref": candidate.get("resume_bref") or "",
        "skills": [],
        "experience": [],
        "realisations": [],
        "langues_parlees": [],
        "type_contrat": [],
        "analyse": candidate.get("analyse") or "",
        "categorie_profil": (candidate.get("categorie_profil") or "").strip() or "autre",
    }

    try:
        import json
        from candidate_minio_path import get_candidate_minio_prefix
        from supabase_storage import get_supabase_storage

        storage = get_supabase_storage()
        if storage and storage.client:
            prefix = get_candidate_minio_prefix(db_candidate_id) + "talentcard_"
            # Nom déterministe : talentcard_{candidate_uuid}.json si present dans la table fichiers_versions
            talentcard_object = None
            try:
                # Essayer de retrouver le dernier talentcard JSON via fichiers_versions dans Supabase
                if supabase_db is not None:
                    fv_resp = (
                        supabase_db.table("fichiers_versions")
                        .select("candidate_uuid")
                        .eq("candidate_id", db_candidate_id)
                        .order("id", desc=True)
                        .limit(1)
                        .execute()
                    )
                    if fv_resp.data:
                        candidate_uuid = fv_resp.data[0].get("candidate_uuid")
                        if candidate_uuid:
                            talentcard_object = f"{prefix}{candidate_uuid}.json"
            except Exception as e:
                print(f"⚠️  Lookup fichiers_versions pour talentcard JSON (Supabase) échoué: {e}")

            # Fallback: utiliser un nom générique si aucun UUID trouvé
            if not talentcard_object:
                talentcard_object = f"{prefix}latest.json"

            success, file_bytes, error = storage.download_file(talentcard_object)
            if success and file_bytes:
                tc_json = json.loads(file_bytes.decode("utf-8"))
                if isinstance(tc_json, dict):
                    merged = dict(talentcard_data)
                    for k, v in tc_json.items():
                        merged[k] = v
                    talentcard_data = merged

    except Exception as e:
        print(f"⚠️  Impossible de compléter la Talent Card depuis le stockage pour candidat {db_candidate_id}: {e}")

    return talentcard_data


def _convert_minio_url_to_proxy(minio_url: str | None, flask_base_url: str = "http://localhost:5002") -> str | None:
    """
    Convertit une URL MinIO en URL proxy Flask.
    
    Args:
        minio_url: URL MinIO (ex: http://localhost:9000/tap-files/candidates/123/profile.jpg)
        flask_base_url: URL de base du serveur Flask
    
    Returns:
        URL proxy (ex: http://localhost:5002/minio-proxy/candidates/123/profile.jpg)
    """
    if not minio_url:
        return None
    
    try:
        # Extraire le nom de l'objet depuis l'URL MinIO
        # Format attendu: http(s)://endpoint/bucket/object_path
        parts = minio_url.split('/', 4)  # Split: ['http:', '', 'localhost:9000', 'bucket', 'object_path']
        
        if len(parts) >= 5:
            object_path = parts[4]
            return f"{flask_base_url}/minio-proxy/{object_path}"
        return minio_url
    except Exception:
        return minio_url


def _convert_project_images_to_proxy(projects: list, flask_base_url: str = "http://localhost:5002") -> list:
    """
    Convertit toutes les URLs MinIO des images de projets en URLs proxy.
    
    Args:
        projects: Liste des projets avec leurs images
        flask_base_url: URL de base du serveur Flask
    
    Returns:
        Liste des projets avec URLs converties
    """
    if not projects or not isinstance(projects, list):
        return projects
    
    for project in projects:
        if not isinstance(project, dict):
            continue
        
        # Convertir main_image_url
        if project.get("main_image_url"):
            project["main_image_url"] = _convert_minio_url_to_proxy(
                project["main_image_url"],
                flask_base_url
            )
        
        # Convertir preview_images
        if project.get("preview_images") and isinstance(project["preview_images"], list):
            for img in project["preview_images"]:
                if isinstance(img, dict) and img.get("url"):
                    img["url"] = _convert_minio_url_to_proxy(img["url"], flask_base_url)
        
        # Convertir images (si présent)
        if project.get("images") and isinstance(project["images"], list):
            converted_images = []
            for img in project["images"]:
                if isinstance(img, str):
                    converted_images.append(_convert_minio_url_to_proxy(img, flask_base_url))
                elif isinstance(img, dict) and img.get("url"):
                    img["url"] = _convert_minio_url_to_proxy(img["url"], flask_base_url)
                    converted_images.append(img)
                else:
                    converted_images.append(img)
            project["images"] = converted_images
    
    return projects


def _minio_object_name_from_url(url: str, bucket_name: str) -> str | None:
    if not url:
        return None
    try:
        marker = f"/{bucket_name}/"
        if marker in url:
            return url.split(marker, 1)[1]
        # fallback (moins fiable): après le dernier /
        return url.split("/")[-1]
    except Exception:
        return None


def _get_candidate_info(db_candidate_id: int, fields: list[str]) -> dict:
    """
    Fonction utilitaire pour récupérer des informations sur un candidat depuis la base de données.
    
    Args:
        db_candidate_id: ID du candidat
        fields: Liste des champs à récupérer (ex: ['image_minio_url', 'email', 'phone'])
    
    Returns:
        dict avec les valeurs récupérées (clés = noms des champs)
    """
    if supabase_db is None:
        print("⚠️  Supabase DB non configuré pour _get_candidate_info")
        return {}

    try:
        # Supabase ne supporte pas directement une liste de colonnes dynamique via table().select() avec liste Python,
        # on construit donc une chaîne "col1,col2,...".
        fields_str = ", ".join(fields) if fields else "*"
        resp = (
            supabase_db.table("candidates")
            .select(fields_str)
            .eq("id", db_candidate_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
        return row or {}
    except Exception as e:
        print(f"⚠️  Erreur Supabase récupération infos candidat (id={db_candidate_id}): {e}")
        return {}


def _build_candidate_embedding_text_from_talentcard(talentcard_data: dict) -> str:
    """
    Construit le texte d'embedding pour un candidat à partir de la talent card.
    Domaine (categorie_profil) + titre + compétences + résumé bref.
    """
    if not talentcard_data:
        return ""
    categorie = (talentcard_data.get("categorie_profil") or "").strip()
    titre = (talentcard_data.get("Titre de profil") or "").strip()
    skills = talentcard_data.get("skills") or []
    if isinstance(skills, str):
        skills = [skills]
    skills_text = ", ".join([str(s) for s in skills if s])
    resume_bref = (talentcard_data.get("resume_bref") or "").strip()
    parts = [categorie, titre, skills_text, resume_bref]
    return " | ".join([p for p in parts if p])


def _build_job_embedding_text_from_payload(data: dict) -> str:
    """
    Texte sémantique pour l'embedding d'une offre (RETRIEVAL_DOCUMENT),
    aligné sur les champs envoyés par le backend Nest (createRecruiterJob).
    """
    if not data:
        return ""
    keys_order = (
        "title",
        "categorie_profil",
        "niveau_attendu",
        "niveau_seniorite",
        "experience_min",
        "contrat",
        "entreprise",
        "presence_sur_site",
        "localisation",
        "location_type",
        "disponibilite",
        "reason",
        "main_mission",
        "tasks_other",
    )
    parts = []
    for k in keys_order:
        v = data.get(k)
        if v is not None and str(v).strip():
            parts.append(str(v).strip())
    return " | ".join(parts)


@app.route("/api/offres/embed", methods=["POST"])
def embed_job_offer():
    """
    Génère l'embedding Gemini d'une offre **avant** insertion en base (appelé par Nest).

    Body JSON : champs offre (title, categorie_profil, main_mission, localisation, …).

    Réponse 200 : { "embedding": [float, ...] }
    """
    try:
        data = request.get_json(silent=True) or {}
        text = _build_job_embedding_text_from_payload(data)
        if not text.strip():
            return (
                jsonify({"error": "Texte offre insuffisant pour générer un embedding"}),
                400,
            )
        vec = generer_embedding(text, task_type="RETRIEVAL_DOCUMENT")
        if not vec:
            return (
                jsonify(
                    {
                        "error": "Échec génération embedding (vérifier GEMINI_API_KEY / modèle Gemini)"
                    }
                ),
                503,
            )
        return jsonify({"embedding": vec})
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/offres/matching/<int:db_candidate_id>', methods=['GET'])
def match_offers_for_candidate(db_candidate_id: int):
    """
    Matching sémantique entre un candidat et les offres via embeddings Gemini.

    - Récupère (ou génère) l'embedding du candidat à partir de la talent card.
    - Récupère les offres avec embedding.
    - Calcule la similarité cosinus.
    - Filtre score > 0.70 et retourne les 20 meilleures offres, triées par score décroissant.

    Réponse:
    {
      "jobs": [
        {
          ...toutes les colonnes de jobs...,
          "score": 0.87
        }
      ]
    }
    """
    try:
        if supabase_db is None:
            print("❌ Supabase DB non configuré pour /api/offres/matching")
            return jsonify({"error": "Configuration Supabase manquante côté serveur"}), 500

        candidate_embedding = None

        # 1) Récupérer l'embedding existant du candidat dans Supabase
        try:
            resp = (
                supabase_db.table("candidates")
                .select("embedding")
                .eq("id", db_candidate_id)
                .limit(1)
                .execute()
            )
            if not resp.data:
                return jsonify({"error": "Candidat introuvable"}), 404
            row = resp.data[0]
            candidate_embedding = parse_embedding(row.get("embedding"))
        except Exception as e:
            print(f"⚠️ Erreur lecture embedding candidat Supabase (id={db_candidate_id}): {e}")
            candidate_embedding = None

        # 2) Si absent, construire un texte depuis la talent card et générer l'embedding, puis le sauvegarder dans Supabase
        if candidate_embedding is None:
            talentcard_data = _load_talentcard_from_db(db_candidate_id)
            text = _build_candidate_embedding_text_from_talentcard(talentcard_data)
            if text:
                vec = generer_embedding(text)
                if vec:
                    candidate_embedding = vec
                    try:
                        embedding_json = embedding_to_json(candidate_embedding)
                        supabase_db.table("candidates").update(
                            {"embedding": embedding_json}
                        ).eq("id", db_candidate_id).execute()
                        print(f"✅ Embedding candidat mis à jour dans Supabase (id={db_candidate_id})")
                    except Exception as e:
                        print(f"⚠️ Impossible de mettre à jour l'embedding candidat dans Supabase: {e}")

        if candidate_embedding is None:
            return jsonify({"jobs": [], "error": "Embedding candidat indisponible"}), 500

        # 3) Récupérer toutes les offres avec leurs embeddings depuis Supabase
        try:
            jobs_resp = supabase_db.table("jobs").select("*").execute()
            jobs_rows = jobs_resp.data or []
        except Exception as e:
            print(f"⚠️ Erreur lecture jobs Supabase: {e}")
            return jsonify({"jobs": [], "error": "Impossible de récupérer les offres"}), 500

        # 4) Calculer les similarités
        scored_jobs = []
        for r in jobs_rows:
            job = dict(r)
            job_embedding = parse_embedding(job.get("embedding"))
            if not job_embedding:
                continue
            sim = calculer_similarite(candidate_embedding, job_embedding)
            if sim is None:
                continue
            # Règle métier: ne retourner que les offres strictement > 60%.
            if sim <= 0.60:
                continue
            job_with_score = {}
            for k, v in job.items():
                if hasattr(v, "isoformat"):
                    job_with_score[k] = v.isoformat()
                else:
                    job_with_score[k] = v
            job_with_score["score"] = round(float(sim), 4)
            scored_jobs.append(job_with_score)

        scored_jobs.sort(key=lambda j: j["score"], reverse=True)
        scored_jobs = scored_jobs[:20]

        return jsonify({"jobs": scored_jobs})
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def _get_candidate_contract_types(db_candidate_id: int) -> list[str]:
    """
    Retourne la liste des types de contrat du candidat (CDI, Freelance, etc.).
    Dans le nouveau schéma, ces informations sont stockées dans la colonne candidates.type_contrat.
    Cette colonne peut contenir soit une chaîne JSON (liste), soit une chaîne séparée par des virgules.
    """
    import json
    if supabase_db is None:
        print("⚠️  Supabase DB non configuré pour _get_candidate_contract_types")
        return []

    try:
        resp = (
            supabase_db.table("candidates")
            .select("type_contrat")
            .eq("id", db_candidate_id)
            .limit(1)
            .execute()
        )
        if not resp.data:
            return []

        raw_value = resp.data[0].get("type_contrat")

        # Si c'est déjà une liste/tuple (cas improbable mais robuste)
        if isinstance(raw_value, (list, tuple)):
            return [str(v).strip() for v in raw_value if v and str(v).strip()]

        if not isinstance(raw_value, str):
            raw_value = str(raw_value)

        raw_value = raw_value.strip()
        if not raw_value:
            return []

        # JSON list (ex: ["CDI", "Freelance"])
        if raw_value.lstrip().startswith("["):
            try:
                parsed = json.loads(raw_value)
                if isinstance(parsed, list):
                    return [str(v).strip() for v in parsed if v and str(v).strip()]
            except Exception as parse_err:
                print(f"⚠️  Erreur parsing JSON type_contrat (candidate_id={db_candidate_id}): {parse_err}")

        # Fallback: chaîne séparée par des virgules
        return [part.strip() for part in raw_value.split(",") if part and part.strip()]

    except Exception as e:
        print(f"⚠️  Erreur récupération type_contrat depuis candidates (Supabase): {e}")
        return []


def _get_candidate_image_url(db_candidate_id: int) -> str | None:
    """
    Fonction utilitaire pour récupérer l'URL de l'image d'un candidat.
    
    Args:
        db_candidate_id: ID du candidat
    
    Returns:
        URL de l'image ou None
    """
    result = _get_candidate_info(db_candidate_id, ['image_minio_url'])
    return result.get('image_minio_url')


def _delete_old_cv_files(db_candidate_id: int, old_candidate_uuid: str | None, minio_prefix: str) -> None:
    """
    Supprime les anciens fichiers CV d'un candidat dans Supabase Storage avant un re-import,
    puis réinitialise les URLs dans fichiers_versions pour invalider la vérification d'idempotence.

    Cible storage :
      - CV original brut    : cv_cv_*.pdf  (tous les fichiers qui matchent le pattern)
      - CV corrigé FR/EN    : cv_{uuid}.pdf / cv_{uuid}_en.pdf
      - HTML corrigé FR/EN  : cv_{uuid}.html / cv_{uuid}_en.html
      - JSON corrigé FR/EN  : corrected_data_{uuid}.json / corrected_data_{uuid}_en.json
    Non supprimé ici : image.png (profil), talentcard, portfolio — ils sont régénérés séparément.

    Réinitialisation DB (critique) :
      - corrected_json_minio_url  → None
      - corrected_pdf_minio_url   → None
      - cv_ancienne_url           → None
    Sans ça, la vérification d'idempotence dans /correctedcv/generate détecterait
    des URLs orphelines et tenterait de télécharger des fichiers supprimés (→ 404).
    """
    try:
        storage = get_supabase_storage()
        if not storage or not storage.client:
            return

        files_to_delete = []

        # 1) Fichiers nommés avec l'UUID connu
        if old_candidate_uuid:
            _uuid = old_candidate_uuid
            files_to_delete += [
                f"{minio_prefix}cv_{_uuid}.pdf",
                f"{minio_prefix}cv_{_uuid}_en.pdf",
                f"{minio_prefix}cv_{_uuid}.html",
                f"{minio_prefix}cv_{_uuid}_en.html",
                f"{minio_prefix}corrected_data_{_uuid}.json",
                f"{minio_prefix}corrected_data_{_uuid}_en.json",
            ]

        # 2) CV originaux bruts (pattern cv_cv_*.pdf) — on liste le dossier pour trouver tous
        folder = minio_prefix.rstrip("/")
        listed = storage.list_files(folder)
        for item in listed:
            fname = item.get("name", "") if isinstance(item, dict) else str(item)
            if fname.startswith("cv_cv_") and fname.endswith(".pdf"):
                files_to_delete.append(f"{minio_prefix}{fname}")

        # Dédoublonner
        files_to_delete = list(dict.fromkeys(files_to_delete))

        deleted_count = 0
        for obj in files_to_delete:
            ok, _ = storage.delete_file(obj)
            if ok:
                deleted_count += 1
                print(f"🗑️ [Re-import] Ancien fichier CV supprimé: {obj}")
        if deleted_count:
            print(f"🗑️ [Re-import] {deleted_count} ancien(s) fichier(s) CV supprimé(s) pour candidat {db_candidate_id}")

    except Exception as e:
        print(f"⚠️ [Re-import] Erreur suppression anciens CV Storage (non bloquant): {e}")

    # CRITIQUE : réinitialiser les URLs dans fichiers_versions pour que la vérification
    # d'idempotence ne croie pas que les fichiers supprimés existent encore.
    # Sans ça → /correctedcv/generate retourne immédiatement "existe déjà" et tente
    # de télécharger des fichiers inexistants → 404 répétés + portfolio sans contexte CV.
    try:
        if supabase_db is not None:
            supabase_db.table("fichiers_versions").update({
                "corrected_json_minio_url": None,
                "corrected_pdf_minio_url": None,
                "cv_ancienne_url": None,
            }).eq("candidate_id", db_candidate_id).execute()
            print(f"🔄 [Re-import] URLs CV réinitialisées dans fichiers_versions pour candidat {db_candidate_id}")
    except Exception as e:
        print(f"⚠️ [Re-import] Erreur réinitialisation fichiers_versions (non bloquant): {e}")


def _upload_to_minio_with_logging(minio_storage, file_bytes: bytes, object_name: str, content_type: str = None) -> tuple[bool, str | None, str | None]:
    """
    Upload un fichier vers le stockage (Supabase) avec logs automatiques.
    
    Args:
        minio_storage: Instance du client MinIO
        file_bytes: Contenu du fichier à uploader
        object_name: Nom de l'objet dans MinIO
        content_type: Type MIME du fichier (optionnel)
    
    Returns:
        tuple (success, url, error)
    """
    try:
        # Si aucun content_type n'est fourni, le déduire à partir de l'extension du fichier
        if not content_type:
            _, ext = os.path.splitext(object_name)
            ext = (ext or "").lower()
            mime_map = {
                ".pdf": "application/pdf",
                ".html": "text/html",
                ".htm": "text/html",
                ".doc": "application/msword",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".json": "application/json",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".svg": "image/svg+xml",
            }
            content_type = mime_map.get(ext) or content_type

        storage = get_supabase_storage()
        if not storage or not storage.client:
            print("⚠️  Supabase Storage non initialisé pour upload")
            return False, None, "Supabase Storage non initialisé"

        success, url, error = storage.upload_file(
            file_bytes,
            object_name,
            content_type=content_type,
        )
        if success:
            print(f"✅ Fichier uploadé vers Supabase Storage: {object_name}")
            return True, url, None
        else:
            print(f"⚠️  Échec upload vers Supabase Storage ({object_name}): {error}")
            return False, None, error
    except Exception as e:
        error_msg = str(e)
        print(f"⚠️  Erreur upload vers Supabase Storage ({object_name}): {error_msg}")
        return False, None, error_msg


def _get_candidate_cv_text(db_candidate_id: int) -> tuple[str | None, str | None]:
    """
    Récupère et extrait le texte du CV d'un candidat depuis Supabase Storage.
    
    Args:
        db_candidate_id: ID du candidat
    
    Returns:
        tuple (cv_text, cv_filename) ou (None, None) si erreur
    """
    if supabase_db is None:
        print("⚠️  Supabase DB non configuré pour _get_candidate_cv_text")
        return None, None

    try:
        # Nouveau schéma : le CV original est stocké dans fichiers_versions.cv_ancienne_url
        resp = (
            supabase_db.table("fichiers_versions")
            .select("cv_ancienne_url")
            .eq("candidate_id", db_candidate_id)
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else {}
        cv_url_or_path = row.get("cv_ancienne_url")

        if not cv_url_or_path:
            print(f"⚠️  Aucun cv_ancienne_url en base pour candidate_id={db_candidate_id}")
            return None, None

        # Supporter à la fois un chemin Storage (objet) et une URL signée contenant /tap-files/
        object_name = None
        try:
            marker = "/tap-files/"
            if isinstance(cv_url_or_path, str) and marker in cv_url_or_path:
                object_name = cv_url_or_path.split(marker, 1)[1]
            else:
                object_name = cv_url_or_path
        except Exception:
            object_name = cv_url_or_path

        storage = get_supabase_storage()
        if not storage or not storage.client:
            print("⚠️  Supabase Storage non initialisé pour _get_candidate_cv_text")
            return None, None

        success, cv_bytes, error = storage.download_file(object_name)
        if success and cv_bytes:
            filename = os.path.basename(object_name)
            cv_text = _extract_text_from_cv_bytes(cv_bytes, filename)
            preview = (cv_text[:240] + "...") if len(cv_text) > 240 else cv_text
            print(f"✅ CV texte extrait ({len(cv_text)} chars): {preview!r}")
            if cv_text and cv_text.strip():
                return cv_text, filename
        else:
            print(f"⚠️  Impossible de télécharger le CV depuis Supabase Storage: {error}")
    except Exception as e:
        print(f"⚠️  Erreur récupération/extraction CV (Supabase): {e}")
    
    return None, None


def _convert_docx_to_pdf(docx_path: str, pdf_path: str) -> bool:
    """
    Convertit un fichier DOCX en PDF.
    
    Args:
        docx_path: Chemin vers le fichier DOCX source
        pdf_path: Chemin de destination pour le PDF
        
    Returns:
        bool: True si la conversion réussit, False sinon
    """
    if not os.path.exists(docx_path):
        print(f"⚠️  Fichier DOCX introuvable: {docx_path}")
        return False
    
    try:
        # ✅ Priorité: LibreOffice headless (solution la plus robuste côté serveur)
        import shutil
        import subprocess

        libreoffice_cmd = None
        mac_soffice = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
        if os.path.exists(mac_soffice):
            libreoffice_cmd = mac_soffice
        else:
            libreoffice_cmd = shutil.which("soffice") or shutil.which("libreoffice")

        if libreoffice_cmd:
            pdf_dir = os.path.dirname(pdf_path)
            os.makedirs(pdf_dir, exist_ok=True)

            cmd = [
                libreoffice_cmd,
                "--headless",
                "--nologo",
                "--nofirststartwizard",
                "--convert-to", "pdf",
                "--outdir", pdf_dir,
                docx_path,
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=90)
            if result.returncode == 0:
                base_name = os.path.splitext(os.path.basename(docx_path))[0]
                produced_pdf = os.path.join(pdf_dir, f"{base_name}.pdf")
                if os.path.exists(produced_pdf):
                    if produced_pdf != pdf_path:
                        os.replace(produced_pdf, pdf_path)
                    print(f"✅ Conversion DOCX -> PDF réussie via LibreOffice: {pdf_path}")
                    return True
            else:
                stderr = (result.stderr or b"").decode(errors="ignore")
                stdout = (result.stdout or b"").decode(errors="ignore")
                print(f"⚠️  LibreOffice conversion failed (rc={result.returncode}). stderr={stderr!r} stdout={stdout!r}")
        else:
            print("⚠️  LibreOffice non trouvé (soffice/libreoffice).")

        # Fallback: docx2pdf (utile sur certains environnements, mais moins fiable sur serveur/macOS sans Word)
        try:
            from docx2pdf import convert  # type: ignore
            convert(docx_path, pdf_path)
            if os.path.exists(pdf_path):
                print(f"✅ Conversion DOCX -> PDF réussie via docx2pdf (fallback): {pdf_path}")
                return True
        except Exception as e:
            print(f"⚠️  docx2pdf fallback échoué: {e}")

        print("❌ Impossible de convertir DOCX en PDF (LibreOffice/docx2pdf indisponibles ou en erreur).")
        return False

    except Exception as e:
        print(f"❌ Erreur lors de la conversion DOCX -> PDF: {e}")
        import traceback
        traceback.print_exc()
        return False


# Format A4 pour le CV : 21 cm × 29,7 cm
CV_PDF_FORMAT_WIDTH_CM = 21
CV_PDF_FORMAT_HEIGHT_CM = 29.7


def _convert_cv_html_to_pdf(html_path: str, pdf_path: str) -> bool:
    """
    Convertit le CV HTML en PDF au format A4 (21 cm × 29,7 cm) via Playwright.
    """
    if not os.path.exists(html_path):
        print(f"⚠️  Fichier HTML CV introuvable: {html_path}")
        return False
    try:
        import http.server
        import socketserver
        import random
        import threading
        from playwright.sync_api import sync_playwright

        temp_dir = os.path.dirname(html_path)
        html_filename = os.path.basename(html_path)

        class _CVHTTPHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=temp_dir, **kwargs)
            def log_message(self, format, *args):
                pass

        class _Reusable(socketserver.TCPServer):
            allow_reuse_address = True

        httpd = None
        for _ in range(15):
            try:
                port = random.randint(8000, 9000)
                httpd = _Reusable(("", port), _CVHTTPHandler)
                break
            except OSError:
                continue
        if not httpd:
            print("❌ Aucun port disponible pour servir le HTML CV")
            return False
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                # Viewport et PDF en A4 : 21 cm × 29,7 cm
                inch_w = CV_PDF_FORMAT_WIDTH_CM / 2.54
                inch_h = CV_PDF_FORMAT_HEIGHT_CM / 2.54
                page.set_viewport_size({"width": int(round(inch_w * 96)), "height": int(round(inch_h * 96))})
                page.goto(f"http://localhost:{port}/{html_filename}", wait_until="networkidle", timeout=30000)
                page.wait_for_load_state("networkidle", timeout=10000)
                page.wait_for_timeout(1500)
                os.makedirs(os.path.dirname(pdf_path) or ".", exist_ok=True)
                page.pdf(
                    path=pdf_path,
                    print_background=True,
                    format="A4",  # 21 cm × 29,7 cm
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                )
                browser.close()
            httpd.shutdown()
            server_thread.join(timeout=2)
            if os.path.exists(pdf_path):
                print(f"✅ Conversion CV HTML -> PDF réussie: {pdf_path}")
                return True
        finally:
            try:
                httpd.shutdown()
                server_thread.join(timeout=1)
            except Exception:
                pass
        return False
    except Exception as e:
        print(f"❌ Erreur conversion CV HTML -> PDF: {e}")
        import traceback
        traceback.print_exc()
        return False


def _extract_text_from_cv_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extrait un texte du CV (PDF/DOCX/images) pour aider l'agent B1 à corriger.
    Retourne "" si extraction impossible.
    """
    if not file_bytes:
        return ""

    ext = os.path.splitext(filename or "")[1].lower()

    # PDF (extraction déterministe, puis fallback OCR si nécessaire)
    if ext == ".pdf":
        extracted_text = ""
        try:
            extracted_text, warnings = extract_text_from_pdf_bytes(file_bytes)
            if warnings:
                print(f"⚠️  Extraction PDF warnings: {warnings}")
        except Exception as e:
            print(f"⚠️  Extraction texte PDF échouée: {e}")

        # Si pas assez de texte, fallback OCR (peut nécessiter Poppler)
        # Utiliser la fonction heuristique pour détecter les PDFs qui nécessitent OCR
        from A1.ocr import should_fallback_to_ocr
        
        should_use_ocr = should_fallback_to_ocr(extracted_text or "", min_chars=200)
        
        if should_use_ocr:
            print(f"📸 Texte extrait insuffisant ou de mauvaise qualité ({len((extracted_text or '').strip())} chars), utilisation de l'OCR...")
            try:
                ocr_res = ocr_pdf_bytes(file_bytes, lang="fra+eng")
                if ocr_res.warnings:
                    print(f"⚠️  OCR PDF warnings: {ocr_res.warnings}")
                ocr_text = (ocr_res.text or "").strip()
                # Utiliser le texte OCR si il est meilleur que l'extraction normale
                if len(ocr_text) > len((extracted_text or "").strip()):
                    print(f"✅ OCR réussi: {len(ocr_text)} caractères extraits (vs {len((extracted_text or '').strip())} avec extraction normale)")
                    return ocr_text
                elif ocr_text:
                    print(f"✅ OCR a extrait {len(ocr_text)} caractères")
                    return ocr_text
            except Exception as e:
                print(f"⚠️  OCR PDF échoué (fallback): {e}")
                # Continuer avec le texte extrait même s'il est court

        return (extracted_text or "").strip()

    # DOCX
    if ext == ".docx":
        try:
            import tempfile
            import docx2txt  # type: ignore

            with tempfile.NamedTemporaryFile(suffix=".docx", delete=True) as tmp:
                tmp.write(file_bytes)
                tmp.flush()
                txt = docx2txt.process(tmp.name) or ""
                return str(txt).strip()
        except Exception as e:
            print(f"⚠️  Extraction texte DOCX échouée: {e}")
            return ""

    # Images (OCR)
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}:
        try:
            txt, warnings = extract_text_from_image_bytes(file_bytes)
            if warnings:
                print(f"⚠️  OCR image warnings: {warnings}")
            return (txt or "").strip()
        except Exception as e:
            print(f"⚠️  OCR image échoué: {e}")
            return ""

    # Autres formats: pas gérés pour l'instant
    return ""


def _generate_corrected_cv_from_talentcard(
    talentcard_data: dict,
    db_candidate_id: int,
    candidate_uuid: str,
    *,
    cv_text: str | None = None,
    feedback_comments: str | None = None,
    version_number: int = 1,
):
    """
    Enchaîne agent 1 -> agent 2:
    - candidate = talentcard (agent 1)
    - analysis = déterministe (petites règles) pour guider l'agent 2
    - feedback_comments = commentaires précédents pour améliorer la génération
    """
    # Enrichir le talentcard avec l'URL de la photo (pour affichage ville, pays, image sur le CV)
    img_url = _get_candidate_image_url(db_candidate_id)
    if img_url:
        talentcard_data = dict(talentcard_data)
        talentcard_data["profile_image_url"] = _convert_minio_url_to_proxy(img_url) or img_url
        talentcard_data["image_minio_url"] = img_url
    # On envoie à l'agent B1 l'output A1 EXACT (talentcard_data) via le paramètre `analysis`
    analysis = talentcard_data
    html_template_path = None
    for p in CV_HTML_TEMPLATE_PATHS:
        if os.path.exists(p):
            html_template_path = p
            break
    if not html_template_path:
        raise FileNotFoundError(f"Template CV HTML introuvable. Chemins essayés: {CV_HTML_TEMPLATE_PATHS}")

    try:
        import tempfile
        import shutil

        tmp_dir = tempfile.mkdtemp(prefix="corrected_cv_")
        out_html_path = os.path.join(tmp_dir, f"cv_{candidate_uuid}.html")
        out_json_path = os.path.join(tmp_dir, f"corrected_data_{candidate_uuid}.json")

        # 1) Génération CV corrigé en FR
        result_agent2_fr = generate_corrected_cv_agent2(
            candidate=talentcard_data,
            analysis=analysis,
            cv_text=cv_text,
            template_path=html_template_path,
            out_html_path=out_html_path,
            out_json_path=out_json_path,
            provider="gemini",
            model=None,
            feedback_comments=feedback_comments,
            lang="fr",
        )

        agent_explanation = result_agent2_fr.get("agent_explanation", "")

        # Générer un PDF temporaire (sans stockage persistant sur disque)
        # Sur Windows, NamedTemporaryFile garde le fichier ouvert → Playwright ne peut pas écrire.
        # On utilise mkstemp puis on ferme le fd pour libérer le chemin.
        pdf_converted = False
        pdf_bytes = None
        if os.path.exists(out_html_path):
            fd, tmp_pdf_path = tempfile.mkstemp(suffix=".pdf")
            os.close(fd)
            try:
                pdf_converted = _convert_cv_html_to_pdf(out_html_path, tmp_pdf_path)
                if not pdf_converted:
                    print(f"⚠️  Conversion CV HTML -> PDF échouée pour {out_html_path}")
                elif os.path.exists(tmp_pdf_path):
                    with open(tmp_pdf_path, "rb") as f:
                        pdf_bytes = f.read()
            finally:
                try:
                    os.unlink(tmp_pdf_path)
                except Exception:
                    pass

        storage = get_supabase_storage()
        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
        corrected_minio = {
            "corrected_cv_url": None,
            "corrected_cv_html_url": None,
            "corrected_json_url": None,
            "corrected_pdf_url": None,
            "corrected_pdf_url_fr": None,
            "corrected_pdf_url_en": None,
        }
        try:
            if os.path.exists(out_html_path):
                with open(out_html_path, "rb") as f:
                    html_bytes = f.read()
                object_name = f"{minio_prefix}cv_{candidate_uuid}.html"
                success, url, _ = _upload_to_minio_with_logging(
                    None, html_bytes, object_name, content_type="text/html; charset=utf-8"
                )
                if success:
                    corrected_minio["corrected_cv_html_url"] = url

            if os.path.exists(out_json_path):
                with open(out_json_path, "rb") as f:
                    json_bytes = f.read()
                object_name = f"{minio_prefix}corrected_data_{candidate_uuid}.json"
                success, url, _ = _upload_to_minio_with_logging(
                    None, json_bytes, object_name, content_type="application/json"
                )
                if success:
                    corrected_minio["corrected_json_url"] = url

            if pdf_converted and pdf_bytes:
                # PDF FR (par défaut, contenu FR)
                object_name_fr = f"{minio_prefix}cv_{candidate_uuid}.pdf"
                success_fr, url_fr, _ = _upload_to_minio_with_logging(
                    None, pdf_bytes, object_name_fr, content_type="application/pdf"
                )
                if success_fr:
                    corrected_minio["corrected_pdf_url"] = url_fr
                    corrected_minio["corrected_cv_url"] = url_fr
                    corrected_minio["corrected_pdf_url_fr"] = url_fr
                    print(f"✅ PDF du CV corrigé FR uploadé vers MinIO: {url_fr}")

                # 2) Génération CV corrigé EN (JSON + HTML + PDF)
                # On regénère dans un nouveau dossier temporaire pour ne pas écraser les fichiers FR
                tmp_dir_en = tempfile.mkdtemp(prefix="corrected_cv_en_")
                try:
                    out_html_en = os.path.join(tmp_dir_en, f"cv_{candidate_uuid}_en.html")
                    out_json_en = os.path.join(tmp_dir_en, f"corrected_data_{candidate_uuid}_en.json")

                    result_agent2_en = generate_corrected_cv_agent2(
                        candidate=talentcard_data,
                        analysis=analysis,
                        cv_text=cv_text,
                        template_path=html_template_path,
                        out_html_path=out_html_en,
                        out_json_path=out_json_en,
                        provider="gemini",
                        model=None,
                        feedback_comments=feedback_comments,
                        lang="en",
                    )

                    # Sauvegarder JSON EN dans MinIO
                    if os.path.exists(out_json_en):
                        with open(out_json_en, "rb") as f:
                            json_bytes_en = f.read()
                        object_name_json_en = f"{minio_prefix}corrected_data_{candidate_uuid}_en.json"
                        _upload_to_minio_with_logging(
                            None, json_bytes_en, object_name_json_en, content_type="application/json"
                        )

                    # Générer PDF EN à partir du HTML EN (mkstemp pour éviter Permission denied sur Windows)
                    pdf_bytes_en = None
                    pdf_en_converted = False
                    if os.path.exists(out_html_en):
                        fd_en, tmp_pdf_en_path = tempfile.mkstemp(suffix=".pdf")
                        os.close(fd_en)
                        try:
                            pdf_en_converted = _convert_cv_html_to_pdf(out_html_en, tmp_pdf_en_path)
                            if pdf_en_converted and os.path.exists(tmp_pdf_en_path):
                                with open(tmp_pdf_en_path, "rb") as f:
                                    pdf_bytes_en = f.read()
                        finally:
                            try:
                                os.unlink(tmp_pdf_en_path)
                            except Exception:
                                pass

                    if pdf_en_converted and pdf_bytes_en:
                        object_name_en = f"{minio_prefix}cv_{candidate_uuid}_en.pdf"
                        success_en, url_en, _ = _upload_to_minio_with_logging(
                            None, pdf_bytes_en, object_name_en, content_type="application/pdf"
                        )
                        if success_en:
                            corrected_minio["corrected_pdf_url_en"] = url_en
                            print(f"✅ PDF du CV corrigé EN uploadé vers MinIO: {url_en}")
                finally:
                    try:
                        shutil.rmtree(tmp_dir_en, ignore_errors=True)
                    except Exception:
                        pass
        except Exception as e:
            print(f"⚠️  Erreur upload corrected outputs vers MinIO: {e}")
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass

    # Enregistrer les chemins Storage du CV corrigé dans la table fichiers_versions (Supabase uniquement)
    try:
        if supabase_db is not None:
            try:
                minio_prefix = get_candidate_minio_prefix(db_candidate_id)
                object_name_pdf = f"{minio_prefix}cv_{candidate_uuid}.pdf"
                object_name_json = f"{minio_prefix}corrected_data_{candidate_uuid}.json"

                fv_cv_update = {
                    "candidate_uuid": candidate_uuid,
                    "corrected_json_minio_url": object_name_json[:500],
                    "corrected_pdf_minio_url": object_name_pdf[:500],
                }

                # UPDATE par candidate_id seul pour éviter un doublon si l'UUID
                # a changé entre deux imports de CV.
                cv_update_result = supabase_db.table("fichiers_versions").update(
                    fv_cv_update
                ).eq("candidate_id", db_candidate_id).execute()

                if not cv_update_result.data:
                    # Aucune ligne existante → insertion initiale
                    fv_cv_update["candidate_id"] = db_candidate_id
                    supabase_db.table("fichiers_versions").insert(fv_cv_update).execute()

                print(f"✅ fichiers_versions synchronisé dans Supabase pour candidate_id={db_candidate_id}, candidate_uuid={candidate_uuid}")
            except Exception as e:
                print(f"⚠️  Erreur synchro fichiers_versions dans Supabase: {e}")
    except Exception as e:
        print(f"⚠️  Erreur lors de l'enregistrement du CV corrigé dans fichiers_versions (Supabase): {e}")

    # Normalized JSON depuis la génération FR (source principale pour les données CV)
    normalized_flat = result_agent2_fr.get("normalized_flat") or result_agent2_fr.get("corrected_json") or {}
    return {
        "html_path": None,
        "json_path": None,
        "pdf_path": None,
        "pdf_available": pdf_converted,
        "minio_urls": corrected_minio,
        "analysis_used": analysis,
        "download_url": f"/correctedcv/{candidate_uuid}/download",
        "preview_url": f"/correctedcv/{candidate_uuid}/preview?version={version_number}" if pdf_converted else None,
        "version_number": version_number,
        "cv_version_id": None,
        "agent_explanation": agent_explanation,
        "Realisations": normalized_flat.get("Realisations") or normalized_flat.get("realisations") or [],
        "Educations": normalized_flat.get("Educations") or normalized_flat.get("educations") or [],
        "corrected_json": normalized_flat,
    }




@app.route("/process", methods=["POST"])
def process_candidate():
    # Si l'appel provient du backend Nest, on reçoit `existing_candidate_id`.
    # Dans ce cas, on NE doit PAS créer un nouveau candidat : on réutilise celui déjà créé côté Nest.
    existing_candidate_id = (request.form.get("existing_candidate_id") or "").strip()
    candidate_uuid = None

    # Récupérer l'utilisateur connecté (optionnel) pour lier le candidat dès la création
    # Utilise get_optional_user_from_request pour supporter Authorization ET form auth_token (multipart)
    current_user_id, _ = get_optional_user_from_request()

    db_candidate_id = None
    id_agent = None
    _existing_form_fields = None  # champs formulaire du candidat existant (re-import uniquement)

    if existing_candidate_id:
        try:
            db_candidate_id = int(existing_candidate_id)
        except Exception:
            return jsonify({"error": "existing_candidate_id invalide"}), 400

        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configuré"}), 500

        # Charger le candidat existant (inclut les champs formulaire pour les préserver)
        try:
            resp = (
                supabase_db.table("candidates")
                .select(
                    "id, id_agent, user_id, candidate_uuid, "
                    "categorie_profil, pays_cible, pret_a_relocater, "
                    "disponibilite, salaire_minimum, type_contrat, "
                    "constraints, search_criteria"
                )
                .eq("id", db_candidate_id)
                .limit(1)
                .execute()
            )
            candidate_row = resp.data[0] if resp.data else None
        except Exception as e:
            print(f"❌ Erreur lecture candidate_id={db_candidate_id} dans Supabase: {e}")
            return jsonify({"error": "Erreur lecture candidat"}), 500

        if not candidate_row:
            return jsonify({"error": f"Candidat {db_candidate_id} introuvable"}), 404

        id_agent = (candidate_row.get("id_agent") or "").strip() if isinstance(candidate_row.get("id_agent"), str) else candidate_row.get("id_agent")
        candidate_uuid = (candidate_row.get("candidate_uuid") or "").strip() if isinstance(candidate_row.get("candidate_uuid"), str) else None

        # Mémoriser les champs remplis via le formulaire d'onboarding pour ne pas les écraser
        # lors du re-import. Ces valeurs seront réinjectées dans talentcard_data après l'analyse IA.
        _existing_form_fields = {
            "categorie_profil": candidate_row.get("categorie_profil"),
            "pays_cible": candidate_row.get("pays_cible"),
            "pret_a_relocater": candidate_row.get("pret_a_relocater"),
            "disponibilite": candidate_row.get("disponibilite"),
            "salaire_minimum": candidate_row.get("salaire_minimum"),
            "type_contrat": candidate_row.get("type_contrat"),
            "constraints": candidate_row.get("constraints"),
            "search_criteria": candidate_row.get("search_criteria"),
        }

        # Si l'utilisateur est connu côté Flask et que la ligne n'a pas de user_id, on la lie
        try:
            if current_user_id is not None and not candidate_row.get("user_id"):
                supabase_db.table("candidates").update({"user_id": current_user_id}).eq("id", db_candidate_id).execute()
        except Exception as e:
            print(f"⚠️  Liaison user_id échouée pour candidat {db_candidate_id}: {e}")

        if not id_agent:
            # Fallback: générer un id_agent et le sauvegarder
            try:
                id_agent = generate_unique_id_agent()
                supabase_db.table("candidates").update({"id_agent": id_agent}).eq("id", db_candidate_id).execute()
                print(f"✅ ID agent généré et assigné au candidat existant: {id_agent}")
            except Exception as e:
                print(f"❌ Erreur génération/assignation id_agent: {e}")
                return jsonify({"error": f"Erreur lors de la génération de l'ID agent: {e}"}), 500
        else:
            print(f"✅ Candidat existant réutilisé: ID DB={db_candidate_id}, id_agent={id_agent}")
    else:
        # Mode historique (appel direct): créer un nouveau candidat
        try:
            id_agent = generate_unique_id_agent()
            print(f"✅ ID agent généré: {id_agent}")
        except Exception as e:
            print(f"❌ Erreur lors de la génération de l'ID agent: {e}")
            return jsonify({"error": f"Erreur lors de la génération de l'ID agent: {e}"}), 500

        try:
            db_candidate_id = create_candidate_record(id_agent, user_id=current_user_id)
            print(f"✅ Enregistrement candidat créé avec ID DB: {db_candidate_id}" + (f" (user_id={current_user_id})" if current_user_id else ""))
        except Exception as e:
            print(f"❌ Erreur lors de la création de l'enregistrement candidat: {e}")
            return jsonify({"error": f"Erreur lors de la création de l'enregistrement candidat: {e}"}), 500
    
    # IMPORTANT: en mode update d'un candidat existant, conserver le même candidate_uuid
    # pour régénérer/écraser les mêmes fichiers et mettre à jour la même ligne fichiers_versions.
    if not candidate_uuid:
        candidate_uuid = str(uuid.uuid4())
    
    cv_file = request.files.get("cv_file")
    cv_content = b""
    if cv_file:
        try:
            cv_content = cv_file.read() or b""
        except Exception as e:
            print(f"⚠️ Lecture du fichier CV échouée: {e}")
            cv_content = b""

    # Tenter d'extraire automatiquement une photo depuis le CV (prioritaire sur l'upload formulaire)
    auto_img_content = b""
    if cv_content:
        try:
            extracted = extract_top_image_from_bytes(cv_content)
            if extracted:
                auto_img_content = extracted
                print("✅ Photo extraite automatiquement depuis le CV (partie haute de la première page)")
        except Exception as e:
            print(f"⚠️ Extraction automatique de la photo depuis le CV échouée: {e}")

    # Récupérer l'image envoyée via le formulaire (fallback si aucune image extraite du CV)
    img_file = request.files.get("img_file")
    img_content = b""
    if img_file:
        try:
            img_content = img_file.read() or b""
        except Exception as e:
            print(f"⚠️ Lecture du fichier image échouée: {e}")
            img_content = b""

    # Si une image a été extraite automatiquement du CV, elle a la priorité sur celle du formulaire
    if auto_img_content:
        img_content = auto_img_content
        img_file = None
    
    # Si aucun CV n'est fourni, retourner une erreur claire
    if not cv_content:
        return jsonify({"error": "Aucun CV fourni ou fichier CV vide"}), 400

    # Récupérer type_contrat (peut être plusieurs valeurs)
    type_contrat_list = request.form.getlist("type_contrat")
    
    # Récupérer other_links si présent (JSON string)
    other_links = []
    other_links_json = request.form.get("other_links")
    if other_links_json:
        try:
            other_links = json.loads(other_links_json)
            if not isinstance(other_links, list):
                other_links = []
        except json.JSONDecodeError:
            print(f"⚠️  Erreur parsing other_links JSON: {other_links_json}")
            other_links = []
    
    form_info = {
        "linkedin_url": request.form.get("linkedin_url"),
        "github_url": request.form.get("github_url"),
        "behance_url": request.form.get("behance_url"),
        "other_links": other_links,
        "target_position": request.form.get("target_position"),
        "target_country": request.form.get("target_country"),
        "pret_a_relocater": request.form.get("pret_a_relocater"),
        "constraints": request.form.get("constraints"),
        "search_criteria": request.form.get("search_criteria"),
        "nationality": request.form.get("nationality"),
        "location_country": request.form.get("location_country"),
        "seniority_level": request.form.get("seniority_level"),
        "disponibilite": request.form.get("disponibilite"),
        "salaire_minimum": request.form.get("salaire_minimum"),
        "domaine_activite": request.form.get("domaine_activite"),
        "type_contrat": type_contrat_list,
    }

    # 🔗 Déduire automatiquement le lien Behance depuis other_links si le champ dédié est vide
    if not (form_info.get("behance_url") or "").strip() and other_links:
        inferred_behance = None
        for link in other_links:
            if not isinstance(link, dict):
                continue
            link_type = (link.get("type") or "").lower()
            link_url = (link.get("url") or "").strip()
            if not link_url:
                continue
            if "behance" in link_type or "behance.net" in link_url:
                inferred_behance = link_url
                break
        if inferred_behance:
            form_info["behance_url"] = inferred_behance

    lang = (request.form.get("lang") or "fr").strip().lower()
    if lang not in ("fr", "en"):
        lang = "fr"

    # Génération des données Talent Card (extraction CV + Gemini) sans DOCX ; PDF via HTML ensuite
    recruit_base = os.getenv("RECRUIT_BASE_URL") or request.url_root.rstrip("/")
    recruit_url = f"{recruit_base}/recruit/{db_candidate_id}"
    result = generate_talent_card(
        form_info, cv_content,
        img_bytes=img_content,
        id_agent=id_agent,
        recruit_url=recruit_url,
        lang=lang,
    )

    if not result:
        return jsonify({"error": "Échec de génération de la Talent Card"}), 500

    # Catégorie/domaine pour ce run:
    # 1) domaine formulaire courant si fourni
    # 2) sinon, en re-import, catégorie existante en base (préserver onboarding)
    # 3) sinon fallback agent
    selected_domaine = (form_info.get("domaine_activite") or "").strip()
    existing_domaine = (
        (_existing_form_fields or {}).get("categorie_profil")
        if isinstance(_existing_form_fields, dict)
        else None
    )
    effective_domaine = selected_domaine or (str(existing_domaine).strip() if existing_domaine else "")
    if effective_domaine:
        result["talentcard"]["domaine_activite"] = effective_domaine
        result["talentcard"]["categorie_profil"] = effective_domaine

    # Upload CV et image vers le stockage Supabase
    minio_urls = {
        'cv_url': None,
        'image_url': None,
        'talentcard_url': None,
        'talentcard_pdf_url': None,
    }

    # IMPORTANT: ne jamais retomber sur "autre" en re-import si le candidat a déjà une catégorie.
    category_for_storage = (
        effective_domaine
        or (result["talentcard"].get("categorie_profil") or "").strip()
    )
    minio_prefix = get_candidate_minio_prefix(db_candidate_id, category_for_storage or None)

    # Re-import : supprimer les anciens fichiers CV avant d'uploader le nouveau
    if existing_candidate_id and cv_content:
        _delete_old_cv_files(db_candidate_id, candidate_uuid, minio_prefix)

    if cv_content and cv_file:
        cv_filename = cv_file.filename or 'cv.pdf'
        cv_object_name = f"{minio_prefix}cv_{cv_filename}"
        success, url, _ = _upload_to_minio_with_logging(None, cv_content, cv_object_name)
        if success:
            minio_urls['cv_url'] = url

    # Upload de la photo : priorité à l'image extraite automatiquement du CV,
    # puis fallback sur l'image envoyée via le formulaire si présente.
    if img_content:
        if img_file:
            img_filename = img_file.filename or 'image.jpg'
            img_extension = os.path.splitext(img_filename)[1] or '.jpg'
        else:
            # image extraite depuis le CV (on force un PNG)
            img_filename = 'image_from_cv.png'
            img_extension = '.png'

        img_object_name = f"{minio_prefix}image{img_extension}"
        success, url, _ = _upload_to_minio_with_logging(None, img_content, img_object_name)
        if success:
            minio_urls['image_url'] = url

    talentcard_data = result["talentcard"]

    # ── Liens sociaux : priorité au formulaire, sinon valeur extraite par l'IA ──
    if form_info.get("linkedin_url"):
        talentcard_data["linkedin"] = (form_info.get("linkedin_url") or "").strip()
    if form_info.get("github_url"):
        talentcard_data["github"] = (form_info.get("github_url") or "").strip()
    if form_info.get("behance_url"):
        talentcard_data["behance"] = (form_info.get("behance_url") or "").strip()

    niveau = (form_info.get("seniority_level") or "").strip() or talentcard_data.get("niveau de seniorite") or talentcard_data.get("niveau_seniorite")
    if niveau:
        talentcard_data["niveau_seniorite"] = (niveau if isinstance(niveau, str) else str(niveau))[:100]

   
    def _form_or_existing(form_key, existing_key=None):
        """Retourne la valeur du formulaire si présente, sinon celle de la DB existante."""
        form_val = form_info.get(form_key)
        if form_val is not None and str(form_val).strip():
            return str(form_val).strip()
        if _existing_form_fields:
            return _existing_form_fields.get(existing_key or form_key)
        return None

    pays_cible_val = _form_or_existing("target_country", "pays_cible")
    if pays_cible_val:
        talentcard_data["pays_cible"] = pays_cible_val
        talentcard_data["target_country"] = pays_cible_val

    pret_val = _form_or_existing("pret_a_relocater")
    if pret_val:
        talentcard_data["pret_a_relocater"] = pret_val[:100]

    constraints_val = _form_or_existing("constraints")
    if constraints_val is not None:
        talentcard_data["constraints"] = constraints_val or None

    search_val = _form_or_existing("search_criteria")
    if search_val is not None:
        talentcard_data["search_criteria"] = search_val or None

    salaire_val = _form_or_existing("salaire_minimum")
    if salaire_val is not None:
        talentcard_data["salaire_minimum"] = salaire_val or None

    disponibilite_val = _form_or_existing("disponibilite")
    if disponibilite_val:
        talentcard_data["disponibilite"] = disponibilite_val

    # type_contrat : formulaire prioritaire, sinon valeur DB existante
    type_contrat_form = form_info.get("type_contrat")
    if type_contrat_form:
        talentcard_data["type_contrat"] = type_contrat_form
    elif _existing_form_fields and _existing_form_fields.get("type_contrat"):
        talentcard_data["type_contrat"] = _existing_form_fields["type_contrat"]

    # categorie_profil : le formulaire (domaine_activite) est prioritaire ;
    # en re-import sans formulaire, on conserve la catégorie déjà en base.
    domaine_form = (form_info.get("domaine_activite") or "").strip()
    if domaine_form:
        talentcard_data["domaine_activite"] = domaine_form
        talentcard_data["categorie_profil"] = domaine_form
    elif _existing_form_fields and _existing_form_fields.get("categorie_profil"):
        # Conserver la catégorie existante — ne pas la laisser écraser par l'IA
        talentcard_data["categorie_profil"] = _existing_form_fields["categorie_profil"]
    # Sauvegarder l'output brut de l'agent A1 (le JSON qui est envoyé à l'agent B1) dans le stockage
    talentcard_json_path = None
    try:
        talentcard_json_bytes = json.dumps(talentcard_data, ensure_ascii=False, indent=2).encode("utf-8")
        talentcard_json_object = f"{minio_prefix}talentcard_{candidate_uuid}.json"
        success_json, url_json, _ = _upload_to_minio_with_logging(
            None, talentcard_json_bytes, talentcard_json_object, content_type="application/json"
        )
    except Exception as e:
        print(f"⚠️  Upload JSON Talent Card échoué: {e}")
    db_update_success = False
    db_error = None
    
    try:
        updated_candidate_id = insert_talent_card(
            talentcard_data,
            minio_urls=minio_urls,
            candidate_id=db_candidate_id,
            candidate_uuid=candidate_uuid,
        )
        # Mise à jour du candidate_uuid directement dans Supabase (source de vérité)
        if supabase_db is not None:
            try:
                supabase_db.table("candidates").update(
                    {"candidate_uuid": candidate_uuid}
                ).eq("id", db_candidate_id).execute()
                print(f"✅ candidate_uuid mis à jour dans Supabase pour id={db_candidate_id}")
            except Exception as e:
                print(f"⚠️  Erreur mise à jour candidate_uuid dans Supabase: {e}")

        # Talent Card PDF : uniquement via HTML → PDF (plus de DOCX)
        flask_base = (os.getenv("RECRUIT_BASE_URL") or request.host_url or "http://localhost:5002").rstrip("/")
        if not flask_base.startswith("http"):
            flask_base = f"http://{flask_base}"
        extra_tc = {}
        if form_info.get("target_country"):
            extra_tc["pays_cible"] = (form_info.get("target_country") or "").strip()
        if form_info.get("pret_a_relocater") is not None and (form_info.get("pret_a_relocater") or "").strip():
            extra_tc["pret_a_relocater"] = (form_info.get("pret_a_relocater") or "").strip()[:100]
        if form_info.get("salaire_minimum") is not None and (form_info.get("salaire_minimum") or "").strip():
            extra_tc["salaire_minimum"] = (form_info.get("salaire_minimum") or "").strip()[:50]
        # Générer la Talent Card en FRANÇAIS
        ok_html_fr, _html_content_fr, _url_html_fr, url_pdf_fr, _err_fr = generate_and_save_talent_card_html(
            candidate_id=db_candidate_id,
            candidate_uuid=id_agent,
            candidate_image_url=minio_urls.get("image_url"),
            candidate_email=talentcard_data.get("email"),
            candidate_phone=talentcard_data.get("phone"),
            candidate_job_title=talentcard_data.get("Titre de profil") or talentcard_data.get("titre_profil"),
            candidate_years_experience=talentcard_data.get("annees_experience"),
            candidate_linkedin_url=talentcard_data.get("linkedin"),
            candidate_github_url=talentcard_data.get("github"),
            candidate_behance_url=talentcard_data.get("behance"),
            flask_base_url=flask_base,
            save_to_minio=True,
            generate_pdf=True,
            lang="fr",
            extra_candidate_data=extra_tc if extra_tc else None,
        )
        if ok_html_fr and url_pdf_fr:
            # PDF FR
            minio_urls["talentcard_pdf_url_fr"] = url_pdf_fr
            # Miroir en base (FR comme PDF par défaut si besoin)
            insert_talent_card(
                talentcard_data,
                minio_urls={"talentcard_pdf_url": url_pdf_fr},
                candidate_id=db_candidate_id,
                candidate_uuid=candidate_uuid,
            )
            print(f"✅ Talent Card PDF FR uploadé vers MinIO: {url_pdf_fr}")

        # Générer aussi la Talent Card en ANGLAIS
        ok_html_en, _html_content_en, _url_html_en, url_pdf_en, _err_en = generate_and_save_talent_card_html(
            candidate_id=db_candidate_id,
            candidate_uuid=id_agent,
            candidate_image_url=minio_urls.get("image_url"),
            candidate_email=talentcard_data.get("email"),
            candidate_phone=talentcard_data.get("phone"),
            candidate_job_title=talentcard_data.get("Titre de profil") or talentcard_data.get("titre_profil"),
            candidate_years_experience=talentcard_data.get("annees_experience"),
            candidate_linkedin_url=talentcard_data.get("linkedin"),
            candidate_github_url=talentcard_data.get("github"),
            candidate_behance_url=talentcard_data.get("behance"),
            flask_base_url=flask_base,
            save_to_minio=True,
            generate_pdf=True,
            lang="en",
            extra_candidate_data=extra_tc if extra_tc else None,
        )
        if ok_html_en and url_pdf_en:
            minio_urls["talentcard_pdf_url_en"] = url_pdf_en
            # On ne remplace pas le PDF FR, on ajoute seulement l'URL EN côté Supabase/MinIO
            insert_talent_card(
                talentcard_data,
                minio_urls={"talentcard_pdf_url_en": url_pdf_en},
                candidate_id=db_candidate_id,
                candidate_uuid=candidate_uuid,
            )
            print(f"✅ Talent Card PDF EN uploadé vers MinIO: {url_pdf_en}")

        db_update_success = True
        print(f"✅ Candidat mis à jour en base de données avec ID: {updated_candidate_id}, UUID: {candidate_uuid}")
    except Exception as e:
        db_error = str(e)
        print(f"❌ Erreur lors de la mise à jour en base de données: {e}")

    response_data = {
        "candidate_id": candidate_uuid,
        "id_agent": id_agent,
        "talentcard": talentcard_data,
        "talentcard_json_path": talentcard_json_path,
        "minio_urls": minio_urls,
        "agent_explanation": result.get("agent_explanation", ""),
        "database": {
            "updated": db_update_success,
            "db_candidate_id": db_candidate_id,
            "error": db_error,
        },
    }

    # Lancer en chaîne (en arrière-plan côté serveur) :
    # - la génération du CV corrigé (Agent B1)
    # - la génération du portfolio one-page (FR + EN)
    try:
        if db_update_success and db_candidate_id:
            from flask import current_app

            # 1) Génération CV corrigé (idempotent)
            try:
                with current_app.test_request_context(
                    f"/correctedcv/{candidate_uuid}/generate",
                    method="POST",
                    json={
                        "db_candidate_id": int(db_candidate_id),
                        "talentcard_data": talentcard_data,
                    },
                ):
                    generate_corrected_cv_after_validation(candidate_uuid)
            except Exception as e:
                print(f"⚠️  Erreur génération CV corrigé depuis /process: {e}")

            # 2) Scoring A2 (idempotent)
            try:
                with current_app.test_request_context(
                    f"/api/scoring/{int(db_candidate_id)}",
                    method="POST",
                    json={},
                ):
                    scoring_candidate(str(int(db_candidate_id)))
            except Exception as e:
                print(f"⚠️  Erreur lancement scoring A2 depuis /process: {e}")

            # 3) Portfolio one-page FR + EN (HTML + PDF en background)
            try:
                for _lang in ("fr", "en"):
                    with current_app.test_request_context(
                        f"/portfolio/{candidate_uuid}/generate-html",
                        method="POST",
                        json={
                            "db_candidate_id": int(db_candidate_id),
                            "version": "one-page",
                            "save_to_minio": True,
                            "lang": _lang,
                        },
                    ):
                        generate_portfolio_html_endpoint(candidate_uuid)
            except Exception as e:
                print(f"⚠️  Erreur génération portfolio one-page depuis /process: {e}")
    except Exception as e:
        print(f"⚠️  Erreur chaîne TalentCard → CV corrigé → portfolio: {e}")

    # Toujours retourner 200, mais avec un warning dans la réponse si la mise à jour a échoué
    if not db_update_success:
        response_data[
            "warning"
        ] = "Talent Card générée avec succès, mais la mise à jour en base de données a échoué"

    return jsonify(response_data), 200


@app.route("/check-cv-photo", methods=["POST"])
def check_cv_photo():
    """
    Endpoint léger pour vérifier si un CV contient une photo exploitable.
    Utilisé par le frontend avant la génération de la Talent Card afin de
    décider s'il faut demander une photo manuelle au candidat.
    """
    cv_file = request.files.get("cv_file")
    if not cv_file:
        return jsonify({"error": "Aucun CV fourni"}), 400

    try:
        cv_bytes = cv_file.read() or b""
    except Exception as e:
        print(f"⚠️ Lecture du fichier CV échouée (/check-cv-photo): {e}")
        return jsonify({"error": "CV illisible", "has_photo": False}), 200

    if not cv_bytes:
        return jsonify({"error": "Fichier CV vide", "has_photo": False}), 200

    try:
        extracted = extract_top_image_from_bytes(cv_bytes)
        has_photo = bool(extracted)
        return jsonify({"has_photo": has_photo}), 200
    except Exception as e:
        print(f"⚠️ Erreur lors de la vérification de photo dans le CV: {e}")
        # On ne bloque pas le flux : on considère simplement qu'il n'y a pas de photo détectable
        return jsonify({"has_photo": False}), 200


def _download_corrected_cv_from_minio(
    db_candidate_id: int,
    candidate_uuid: str,
    version_number: int | None = None,
    lang: str = "fr",
):
    """
    Télécharge le CV corrigé PDF directement depuis MinIO.
    Ne dépend plus d'aucun stockage local sur disque.
    lang: "fr" -> cv_{uuid}.pdf, "en" -> cv_{uuid}_en.pdf
    Retourne (pdf_bytes, file_name) ou (None, None) si introuvable.
    Dans le nouveau schéma, il n'y a plus de versionning explicite en base (fichiers_versions),
    donc version_number est ignoré et on prend simplement le dernier fichier correspondant.
    """
    try:
        if supabase_db is None:
            print("⚠️ _download_corrected_cv_from_minio: Supabase DB non configuré")
            return None, None

        storage = get_supabase_storage()
        if not storage or not storage.client:
            print("⚠️ _download_corrected_cv_from_minio: Supabase Storage non configuré")
            return None, None

        lang = (lang or "fr").lower()
        if lang not in ("fr", "en"):
            lang = "fr"

        minio_prefix = get_candidate_minio_prefix(db_candidate_id)

        # 1) Essayer d'utiliser le chemin stocké dans fichiers_versions (corrected_pdf_minio_url, FR principalement)
        object_name = None
        try:
            fv_resp = (
                supabase_db.table("fichiers_versions")
                .select("corrected_pdf_minio_url")
                .eq("candidate_id", db_candidate_id)
                .eq("candidate_uuid", candidate_uuid)
                .order("id", desc=True)
                .limit(1)
                .execute()
            )
            if fv_resp.data:
                stored_path = fv_resp.data[0].get("corrected_pdf_minio_url")
                if isinstance(stored_path, str) and stored_path.strip():
                    object_name = stored_path.strip()
        except Exception as e:
            print(f"⚠️ _download_corrected_cv_from_minio: lecture fichiers_versions échouée: {e}")

        # Si une langue spécifique est demandée, construire le chemin standard
        if lang == "en":
            # Version EN : cv_{uuid}_en.pdf
            object_name_lang = f"{minio_prefix}cv_{candidate_uuid}_en.pdf"
            # Priorité au chemin explicite EN
            preferred = object_name_lang
            candidates = [p for p in [preferred, object_name] if p]
        else:
            # Version FR : cv_{uuid}.pdf
            object_name_lang = f"{minio_prefix}cv_{candidate_uuid}.pdf"
            preferred = object_name_lang
            candidates = [p for p in [preferred, object_name] if p]

        for obj_name in candidates:
            try:
                ok, file_bytes, error = storage.download_file(obj_name)
                if ok and file_bytes:
                    file_name = os.path.basename(obj_name)
                    return file_bytes, file_name
                if error:
                    print(f"⚠️ _download_corrected_cv_from_minio: erreur téléchargement {obj_name}: {error}")
            except Exception as e:
                print(f"⚠️ _download_corrected_cv_from_minio: exception téléchargement {obj_name}: {e}")

    except Exception as e:
        print(f"⚠️ _download_corrected_cv_from_minio (Supabase): {e}")
    return None, None


def _get_corrected_cv_pdf_bytes(db_candidate_id: int, candidate_uuid: str):
    """
    Compat helper historique.
    Retourne (pdf_bytes, file_name) pour le CV corrigé PDF si disponible dans Supabase Storage,
    sinon (None, None).
    """
    try:
        return _download_corrected_cv_from_minio(db_candidate_id, candidate_uuid)
    except Exception as e:
        print(f"⚠️ _get_corrected_cv_pdf_bytes: {e}")
        return None, None


def _get_portfolio_pdf_bytes(db_candidate_id: int, candidate_uuid: str, version: str = "long"):
    """
    Récupère les bytes du PDF portfolio depuis Supabase Storage.
    Tente d'abord les chemins stockés dans fichiers_versions, puis les chemins standards.
    """
    try:
        if supabase_db is None:
            print("⚠️ _get_portfolio_pdf_bytes: Supabase DB non configuré")
            return None, None

        storage = get_supabase_storage()
        if not storage or not storage.client:
            print("⚠️ _get_portfolio_pdf_bytes: Supabase Storage non configuré")
            return None, None

        minio_prefix = get_candidate_minio_prefix(db_candidate_id)

        # 1) Essayer de lire les chemins stockés dans fichiers_versions (long_pdf_url / one_page_pdf_url)
        stored_paths = []
        try:
            fv_resp = (
                supabase_db.table("fichiers_versions")
                .select("long_pdf_url, one_page_pdf_url")
                .eq("candidate_id", db_candidate_id)
                .eq("candidate_uuid", candidate_uuid)
                .order("id", desc=True)
                .limit(1)
                .execute()
            )
            if fv_resp.data:
                row = fv_resp.data[0]
                if version == "one-page" and row.get("one_page_pdf_url"):
                    stored_paths.append(row["one_page_pdf_url"])
                if version != "one-page" and row.get("long_pdf_url"):
                    stored_paths.append(row["long_pdf_url"])
        except Exception as e:
            print(f"⚠️ _get_portfolio_pdf_bytes: lecture fichiers_versions échouée: {e}")

        # 2) Construire les chemins standards de fallback
        if version == "one-page":
            candidates = [
                f"{minio_prefix}portfolio_{candidate_uuid}_one-page.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_one-page_fr.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_one-page_en.pdf",
            ]
            download_name = "portfolio_one_page.pdf"
        else:
            candidates = [
                f"{minio_prefix}portfolio_{candidate_uuid}.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_fr.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_en.pdf",
            ]
            download_name = "portfolio_long.pdf"

        # Priorité aux chemins stockés, puis aux chemins standards
        all_object_names = [p for p in stored_paths if p] + candidates

        for object_name in all_object_names:
            try:
                ok, file_bytes, error = storage.download_file(object_name)
                if ok and file_bytes:
                    return file_bytes, download_name
                if error:
                    print(f"⚠️ _get_portfolio_pdf_bytes: erreur téléchargement {object_name}: {error}")
            except Exception as e:
                print(f"⚠️ _get_portfolio_pdf_bytes: exception téléchargement {object_name}: {e}")
    except Exception as e:
        print(f"⚠️ _get_portfolio_pdf_bytes ({version}, Supabase): {e}")
    return None, None


@app.route("/recruit/<db_candidate_id>", methods=["GET"])
def recruit_landing(db_candidate_id):
    """
    Page d’atterrissage pour le recruteur (lien du QR code de la Talent Card).
    Affiche les liens vers Talent Card PDF, CV, portfolio long, portfolio one-page
    et l'option « Tout télécharger » (ZIP).
    """
    try:
        from database.connection import DatabaseConnection
        from flask import Response
        DatabaseConnection.initialize()
        db_id = int(db_candidate_id)
        with DatabaseConnection.get_connection() as db:
            cursor = db.cursor(dictionary=True)
            cursor.execute("SELECT candidate_uuid, nom, prenom FROM candidates WHERE id = %s", (db_id,))
            row = cursor.fetchone()
            cursor.close()
        if not row or not row.get("candidate_uuid"):
            return "<h1>Candidat introuvable</h1><p>Ce lien n'est pas valide ou le profil n'est pas encore disponible.</p>", 404
        candidate_uuid = row["candidate_uuid"]
        nom = row.get("nom") or ""
        prenom = row.get("prenom") or ""
        base = os.getenv("RECRUIT_BASE_URL") or request.url_root.rstrip("/")
        assets_base_url = base.rstrip("/") + "/recruit/static/"

        talentcard_pdf_bytes, _ = _get_talent_card_pdf_bytes(db_id)
        has_talentcard = bool(talentcard_pdf_bytes)
        talentcard_url = f"{base}/talentcard/{db_id}/download"
        # URL de base de prévisualisation du CV (la langue sera choisie côté front)
        cv_preview_url = f"{base}/correctedcv/{candidate_uuid}/preview?db_candidate_id={db_id}"
        portfolio_long_url = f"{base}/portfolio/{candidate_uuid}/pdf?db_candidate_id={db_id}&version=long"
        portfolio_one_page_url = f"{base}/portfolio/{candidate_uuid}/pdf?db_candidate_id={db_id}&version=one-page"
        download_all_url = f"{base}/recruit/{db_id}/download-all"

        links_html = []
        if has_talentcard:
            links_html.append(f'<a href="{talentcard_url}" class="btn">TÉLÉCHARGER LA TALENT CARD (PDF)</a>')
        # Le lien CV a un id pour pouvoir afficher un choix de langue côté front
        links_html.append(f'<a href="{cv_preview_url}" class="btn" id="cv-link">VOIR / TÉLÉCHARGER LE CV</a>')
        links_html.append(f'<a href="{portfolio_long_url}" class="btn" id="portfolio-long-link">VOIR LE PORTFOLIO</a>')
        links_html.append(f'<a href="{portfolio_one_page_url}" class="btn" id="portfolio-one-page-link">VOIR LE PORTFOLIO ONE PAGE</a>')
        links_html.append(f'<a href="{download_all_url}" class="btn">TÉLÉCHARGER TOUS LES FICHIERS (ZIP)</a>')

        links_block = "\n    ".join(links_html)
        candidate_name = f"{prenom} {nom}".strip().upper() or "CANDIDAT"
        html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Profil candidat – CV & Portfolio</title>
  <style>
    * {{ box-sizing: border-box; }}
    html, body {{
      margin: 0;
      padding: 7rem 3rem;
      overflow: hidden;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      background: #0d0d0d url('{assets_base_url}Modif-2.jpeg') no-repeat center center;
      background-size: cover;
      color: #fff;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }}
    body::before {{
      content: "";
      position: absolute;
      inset: 0;
      background: url('{assets_base_url}Background-3.png') no-repeat center center;
      background-size: cover;
      pointer-events: none;
    }}
    .content {{
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }}
    h1 {{
      font-size: 72px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin: 0 0 24px 0;
      color: #fff;
      line-height: 1.1;
    }}
    .candidate-name {{
      font-size: 42px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #fff;
      margin: 0 0 64px 0;
      line-height: 1.2;
    }}
    .links {{
      display: flex;
      flex-direction: column;
      gap: 3rem;
    
    }}
    a.btn {{
      display: block;
      padding: 15px 20px;
      background: #ca1b28;
      color: #fff;
      text-decoration: none;
      border-radius: 0;
      font-weight: bold;
      font-size: 28px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-align: center;
      border: none;
      width: 100rem;
      height: 4rem;
      font-weight: 500;
    }}
    a.btn:hover {{ opacity: 0.9; }}
    @media (max-width: 600px) {{
      html, body {{ padding: 5rem 1rem; overflow-x: hidden; overflow-y: auto; }}
      .content {{ max-width: 100%; }}
      h1 {{ font-size: 28px; margin-bottom: 16px; }}
      .candidate-name {{ font-size: 22px; margin-bottom: 2rem; }}
      a.btn {{ width: 100%; max-width: 100%; font-size: 14px; padding: 22px 16px; min-height: 3rem; }}
      .links {{ gap: 1.5rem; width: 100%; }}
    }}
  </style>
</head>
<body>
  <div class="content">
    <h1>Profil candidat</h1>
    <p class="candidate-name">{candidate_name}</p>
    <div class="links">
      {links_block}
    </div>
  </div>
  <!-- Sélecteur de langue pour CV / Portfolio -->
  <div id="lang-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:50; align-items:center; justify-content:center;">
    <div style="background:#111; border:1px solid #ca1b28; padding:32px 28px; max-width:420px; width:90%; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      <h2 style="margin:0 0 8px 0; font-size:24px; letter-spacing:0.08em; text-transform:uppercase; color:#fff;">Choisir la langue</h2>
      <p id="lang-modal-message" style="margin:0 0 24px 0; font-size:16px; color:#ddd;">
        Dans quelle langue souhaitez-vous voir ce document ?
      </p>
      <div style="display:flex; gap:16px; justify-content:center; margin-bottom:12px;">
        <button id="lang-fr-btn" style="flex:1; padding:12px 0; border:none; background:#ca1b28; color:#fff; text-transform:uppercase; font-weight:600; letter-spacing:0.08em; cursor:pointer;">Français</button>
        <button id="lang-en-btn" style="flex:1; padding:12px 0; border:1px solid #555; background:transparent; color:#fff; text-transform:uppercase; font-weight:600; letter-spacing:0.08em; cursor:pointer;">Anglais</button>
      </div>
      <button id="lang-cancel-btn" style="margin-top:4px; padding:6px 0; border:none; background:none; color:#aaa; font-size:13px; cursor:pointer;">Annuler</button>
    </div>
  </div>
  <script>
    (function() {{
      var modal = document.getElementById('lang-modal');
      var msgEl = document.getElementById('lang-modal-message');
      var btnFr = document.getElementById('lang-fr-btn');
      var btnEn = document.getElementById('lang-en-btn');
      var btnCancel = document.getElementById('lang-cancel-btn');
      var pendingLink = null;

      function openModal(link, message) {{
        pendingLink = link;
        if (msgEl && message) msgEl.textContent = message;
        if (modal) modal.style.display = 'flex';
      }}

      function closeModal() {{
        if (modal) modal.style.display = 'none';
        pendingLink = null;
      }}

      function navigateWithLang(lang) {{
        if (!pendingLink) return;
        try {{
          var url = new URL(pendingLink.href);
          url.searchParams.set('lang', lang);
          window.location.href = url.toString();
        }} catch (err) {{
          var sep = pendingLink.href.indexOf('?') !== -1 ? '&' : '?';
          window.location.href = pendingLink.href + sep + 'lang=' + lang;
        }}
      }}

      if (btnFr) btnFr.addEventListener('click', function() {{ navigateWithLang('fr'); }});
      if (btnEn) btnEn.addEventListener('click', function() {{ navigateWithLang('en'); }});
      if (btnCancel) btnCancel.addEventListener('click', closeModal);
      if (modal) modal.addEventListener('click', function(e) {{
        if (e.target === modal) closeModal();
      }});

      var cvLink = document.getElementById('cv-link');
      if (cvLink) {{
        cvLink.addEventListener('click', function(e) {{
          e.preventDefault();
          openModal(cvLink, "Dans quelle langue voulez-vous voir le CV ?");
        }});
      }}

      var portfolioLong = document.getElementById('portfolio-long-link');
      if (portfolioLong) {{
        portfolioLong.addEventListener('click', function(e) {{
          e.preventDefault();
          openModal(portfolioLong, "Dans quelle langue voulez-vous voir le portfolio ?");
        }});
      }}

      var portfolioOnePage = document.getElementById('portfolio-one-page-link');
      if (portfolioOnePage) {{
        portfolioOnePage.addEventListener('click', function(e) {{
          e.preventDefault();
          openModal(portfolioOnePage, "Dans quelle langue voulez-vous voir le portfolio one page ?");
        }});
      }}
    }})();
  </script>
</body>
</html>"""
        return Response(html, mimetype="text/html; charset=utf-8")
    except Exception as e:
        print(f"❌ Erreur page recruteur: {e}")
        return "<h1>Erreur</h1><p>Impossible de charger cette page.</p>", 500


@app.route("/recruit/<db_candidate_id>/download-all", methods=["GET"])
def recruit_download_all(db_candidate_id):
    """
    Télécharge un ZIP contenant tous les fichiers disponibles
    (Talent Card PDF, CV corrigé PDF, portfolio long PDF, portfolio one-page PDF).
    Valide dès la création du candidat.
    """
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configuré"}), 500

        db_id = int(db_candidate_id)
        resp = (
            supabase_db.table("candidates")
            .select("candidate_uuid, nom, prenom")
            .eq("id", db_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
        if not row or not row.get("candidate_uuid"):
            return jsonify({"error": "Candidat introuvable"}), 404
        candidate_uuid = row["candidate_uuid"]
        nom = row.get("nom") or ""
        prenom = row.get("prenom") or ""
        safe_name = re.sub(r"[^\w\s-]", "", f"{prenom}_{nom}".strip()) or "candidat"

        buf = BytesIO()
        with ZipFile(buf, "w") as zf:
            pdf_bytes, tc_name = _get_talent_card_pdf_bytes(db_id)
            if pdf_bytes:
                zf.writestr("talent_card.pdf", pdf_bytes)
            cv_bytes, cv_name = _get_corrected_cv_pdf_bytes(db_id, candidate_uuid)
            if cv_bytes:
                zf.writestr("cv.pdf", cv_bytes)
            portfolio_long_bytes, portfolio_long_name = _get_portfolio_pdf_bytes(
                db_id, candidate_uuid, version="long"
            )
            if portfolio_long_bytes:
                zf.writestr(portfolio_long_name, portfolio_long_bytes)
            portfolio_one_page_bytes, portfolio_one_page_name = _get_portfolio_pdf_bytes(
                db_id, candidate_uuid, version="one-page"
            )
            if portfolio_one_page_bytes:
                zf.writestr(portfolio_one_page_name, portfolio_one_page_bytes)

        buf.seek(0)
        download_name = f"{safe_name}_fichiers.zip"
        return send_file(
            buf,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/zip",
        )
    except Exception as e:
        print(f"❌ Erreur download-all: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/talentcard/<candidate_id>/docx", methods=["GET"])
def generate_docx(candidate_id):
    """Talent Card n'est plus générée en DOCX ; utiliser /talentcard/<db_candidate_id>/download pour le PDF."""
    return jsonify({
        "error": "Talent Card disponible uniquement en PDF",
        "download_pdf": f"/talentcard/{candidate_id}/download",
    }), 410


@app.route("/talentcard/<candidate_id>/json", methods=["GET"])
def download_talentcard_json(candidate_id):
    """
    Télécharge le JSON brut généré par l'agent A1 pour une exécution donnée.
    Compatible Supabase Storage (plus de MinIO).
    """
    try:
        storage = get_supabase_storage()
        if not storage or not storage.client:
            return jsonify({"error": "Stockage Supabase non configuré"}), 500

        # On suppose un chemin standard talentcard_{uuid}.json sous le préfixe candidat
        try:
            db_id = int(candidate_id)
        except (TypeError, ValueError):
            return jsonify({"error": "ID candidat invalide"}), 400

        # Récupérer candidate_uuid via Supabase
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configuré"}), 500

        resp = (
            supabase_db.table("candidates")
            .select("candidate_uuid")
            .eq("id", db_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
        candidate_uuid = row.get("candidate_uuid") if row else None
        if not candidate_uuid:
            return jsonify({"error": "Candidat introuvable ou sans candidate_uuid"}), 404

        prefix = get_candidate_minio_prefix(db_id)
        object_name = f"{prefix}talentcard_{candidate_uuid}.json"

        success, file_bytes, error = storage.download_file(object_name)
        if not success or not file_bytes:
            return jsonify({"error": error or "Échec du téléchargement du JSON depuis Supabase Storage"}), 500

        file_name = f"talentcard_{candidate_uuid}.json"
        return send_file(
            BytesIO(file_bytes),
            as_attachment=True,
            download_name=file_name,
            mimetype="application/json",
        )
    except Exception as e:
        print(f"❌ Erreur lors du téléchargement talentcard JSON depuis Supabase Storage: {e}")
        return jsonify({"error": "Erreur serveur lors du téléchargement du JSON"}), 500


@app.route("/talentcard/<db_candidate_id>", methods=["GET"])
def get_talent_card(db_candidate_id):
    """
    Récupère les données de la Talent Card depuis la base de données.
    
    Returns:
        JSON avec les données complètes de la Talent Card
    """
    try:
        talentcard_data = _load_talentcard_from_db(int(db_candidate_id))
        
        if not talentcard_data:
            return jsonify({"error": "Talent Card non trouvée pour ce candidat"}), 404
        
        return jsonify({
            "success": True,
            "talentcard": talentcard_data,
            "db_candidate_id": int(db_candidate_id)
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur lors de la récupération de la Talent Card: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/talentcard/<db_candidate_id>/generate-html", methods=["POST"])
def generate_talent_card_html_route(db_candidate_id):
    """
    Génère la Talent Card en HTML (template talent_card_template.html), la sauvegarde dans MinIO,
    la convertit en PDF et uploade le PDF dans MinIO.
    Body (JSON, optionnel): { "lang": "fr" | "en" }
    Returns:
        JSON { success, talentcard_html_url, talentcard_html_pdf_url, error? }
    """
    try:
        db_candidate_id_int = int(db_candidate_id)
    except (TypeError, ValueError):
        return jsonify({"error": "ID candidat invalide"}), 400
    data = request.get_json() or {}
    lang = (data.get("lang") or "fr").strip().lower()
    if lang not in ("fr", "en"):
        lang = "fr"
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configuré"}), 500

        resp = (
            supabase_db.table("candidates")
            .select("id, id_agent, image_minio_url, email, phone, linkedin, github, behance, annees_experience, titre_profil")
            .eq("id", db_candidate_id_int)
            .limit(1)
            .execute()
        )
        candidate = resp.data[0] if resp.data else None
        if not candidate:
            return jsonify({"error": "Candidat introuvable"}), 404
        flask_base_url = (os.getenv("RECRUIT_BASE_URL") or request.host_url or "http://localhost:5002").rstrip("/")
        if not flask_base_url.startswith("http"):
            flask_base_url = f"http://{flask_base_url}"
        # Générer Talent Card FR
        success_fr, html_content_fr, minio_html_url_fr, minio_pdf_url_fr, error_fr = generate_and_save_talent_card_html(
            candidate_id=db_candidate_id_int,
            candidate_uuid=candidate["id_agent"] or "",
            candidate_image_url=candidate.get("image_minio_url"),
            candidate_email=candidate.get("email"),
            candidate_phone=candidate.get("phone"),
            candidate_job_title=candidate.get("titre_profil"),
            candidate_years_experience=candidate.get("annees_experience"),
            candidate_linkedin_url=candidate.get("linkedin"),
            candidate_github_url=candidate.get("github"),
            candidate_behance_url=candidate.get("behance"),
            flask_base_url=flask_base_url,
            save_to_minio=True,
            generate_pdf=True,
            lang="fr",
        )
        if not success_fr:
            return jsonify({"success": False, "error": error_fr or "Génération échouée (FR)"}), 500

        # Générer Talent Card EN
        success_en, html_content_en, minio_html_url_en, minio_pdf_url_en, error_en = generate_and_save_talent_card_html(
            candidate_id=db_candidate_id_int,
            candidate_uuid=candidate["id_agent"] or "",
            candidate_image_url=candidate.get("image_minio_url"),
            candidate_email=candidate.get("email"),
            candidate_phone=candidate.get("phone"),
            candidate_job_title=candidate.get("titre_profil"),
            candidate_years_experience=candidate.get("annees_experience"),
            candidate_linkedin_url=candidate.get("linkedin"),
            candidate_github_url=candidate.get("github"),
            candidate_behance_url=candidate.get("behance"),
            flask_base_url=flask_base_url,
            save_to_minio=True,
            generate_pdf=True,
            lang="en",
        )
        if not success_en:
            print(f"⚠️  Génération Talent Card EN échouée: {error_en}")

        # Avec Supabase Storage public/signé, les URLs retournées par generate_and_save_talent_card_html
        # sont directement utilisables par le front.
        return jsonify({
            "success": True,
            "talentcard_html_url_fr": minio_html_url_fr,
            "talentcard_html_pdf_url_fr": minio_pdf_url_fr,
            "talentcard_html_url_en": minio_html_url_en,
            "talentcard_html_pdf_url_en": minio_pdf_url_en,
        }), 200
    except Exception as e:
        print(f"❌ Erreur génération Talent Card HTML/PDF: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/talentcard/<db_candidate_id>/update", methods=["POST"])
def update_talent_card(db_candidate_id):
    """
    Applique les corrections proposées par le candidat et régénère le talent card.
    """
    try:
        data = request.get_json()
        corrections = data.get("corrections", {})
        
        try:
            db_candidate_id_int = int(db_candidate_id)
        except Exception:
            db_candidate_id_int = db_candidate_id

        # Récupérer les données actuelles du candidat depuis Supabase (nouveau schéma : uniquement table candidates)
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configuré"}), 500

        resp = (
            supabase_db.table("candidates")
            .select("*")
            .eq("id", db_candidate_id_int)
            .limit(1)
            .execute()
        )
        candidate = resp.data[0] if resp.data else None
        if not candidate:
            return jsonify({"error": "Candidat introuvable"}), 404
        
        # Helper : ne pas écraser la valeur en base par une correction vide (champ non modifié envoyé en "")
        def _apply_correction(key, candidate_key=None):
            ckey = candidate_key or key
            raw = candidate.get(ckey, "") or ""
            val = corrections.get(key)
            if val is None:
                return raw.strip() if isinstance(raw, str) else (raw or "")
            if isinstance(val, str) and not val.strip():
                return raw.strip() if isinstance(raw, str) else ""
            return val.strip() if isinstance(val, str) else val

        # Construire les données du talent card avec les corrections appliquées
        # Nouveau schéma : plus de tables skills / experiences / realisations / languages / contract_types
        # On garde ces champs uniquement si fournis dans les corrections, sinon listes vides.
        # Pour type_contrat, on se base sur les corrections, puis sur la valeur normalisée en base.
        from typing import List
        current_contract_types: List[str] = _get_candidate_contract_types(db_candidate_id_int)

        talentcard_data = {
            "id_agent": candidate["id_agent"],
            "nom": _apply_correction("nom"),
            "prenom": _apply_correction("prenom"),
            "Titre de profil": _apply_correction("Titre de profil", "titre_profil"),
            "ville": _apply_correction("ville"),
            "pays": _apply_correction("pays"),
            "linkedin": _apply_correction("linkedin"),
            "github": _apply_correction("github"),
            "behance": _apply_correction("behance"),
            "email": _apply_correction("email"),
            "phone": _apply_correction("phone"),
            "annees_experience": corrections["annees_experience"] if "annees_experience" in corrections else candidate.get("annees_experience"),
            "disponibilite": _apply_correction("disponibilite"),
            "pret_a_relocater": _apply_correction("pret_a_relocater"),
            "niveau_seniorite": _apply_correction("niveau_seniorite"),
            "resume_bref": corrections.get("resume_bref", candidate.get("resume_bref", "")),
            "skills": corrections.get("skills", []),
            "experience": corrections.get("experience", []),
            "realisations": corrections.get("realisations", []),
            "langues_parlees": corrections.get("langues_parlees", []),
            "type_contrat": corrections.get("type_contrat", current_contract_types),
            "analyse": corrections.get("analyse", "") or "",
        }
        
        minio_urls = {}

        # Mettre à jour la base avec les corrections
        updated_id = insert_talent_card(talentcard_data, minio_urls=minio_urls, candidate_id=db_candidate_id_int)
        print(f"[Update] insert_talent_card returned id : {updated_id}")

        # Régénérer la Talent Card en HTML puis PDF (plus de DOCX)
        flask_base = (os.getenv("RECRUIT_BASE_URL") or request.host_url or "http://localhost:5002").rstrip("/")
        if not flask_base.startswith("http"):
            flask_base = f"http://{flask_base}"
        update_lang = (data.get("lang") or "fr").strip().lower()
        if update_lang not in ("fr", "en"):
            update_lang = "fr"
        ok_html, _, _url_html, url_pdf, _err = generate_and_save_talent_card_html(
            candidate_id=db_candidate_id_int,
            candidate_uuid=candidate.get("id_agent") or "",
            candidate_image_url=candidate.get("image_minio_url"),
            candidate_email=talentcard_data.get("email"),
            candidate_phone=talentcard_data.get("phone"),
            candidate_job_title=talentcard_data.get("Titre de profil") or talentcard_data.get("titre_profil"),
            candidate_years_experience=talentcard_data.get("annees_experience"),
            candidate_linkedin_url=talentcard_data.get("linkedin"),
            candidate_github_url=talentcard_data.get("github"),
            candidate_behance_url=talentcard_data.get("behance") or candidate.get("behance"),
            flask_base_url=flask_base,
            save_to_minio=True,
            generate_pdf=True,
            lang=update_lang,
        )
        if ok_html and url_pdf:
            insert_talent_card(talentcard_data, minio_urls={"talentcard_pdf_url": url_pdf}, candidate_id=db_candidate_id_int)

        return jsonify({
            "success": True,
            "message": "Talent Card mis à jour avec succès",
            "talentcard": talentcard_data,
            "db_candidate_id": updated_id,
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour du talent card: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/talentcard/<db_candidate_id>/validate", methods=["POST"])
def validate_talent_card(db_candidate_id):
    """
    Valide la Talent Card (PDF généré via HTML). Retourne l'URL de téléchargement du PDF.
    """
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configuré"}), 500

        resp = (
            supabase_db.table("candidates")
            .select("id_agent, candidate_uuid")
            .eq("id", int(db_candidate_id))
            .limit(1)
            .execute()
        )
        candidate = resp.data[0] if resp.data else None

        if not candidate:
            return jsonify({"error": "Candidat introuvable"}), 404

        candidate_uuid = candidate.get("candidate_uuid") or candidate.get("id_agent")
        talentcard_data = _load_talentcard_from_db(int(db_candidate_id))

        # Ne plus déclencher n8n/Agent 2 (B1) automatiquement après validation.
        # B1 (CV corrigé) et Agent 3 (chatbot) ne se lancent que lorsque l'utilisateur
        # les demande explicitement (bouton "Générer le CV" et "Démarrer la collecte").

        return jsonify({
            "success": True,
            "message": "Talent Card validée",
            "download_url": f"/talentcard/{db_candidate_id}/download",
            "preview_url": f"/talentcard/{db_candidate_id}/preview",
            "candidate_uuid": candidate_uuid,
            "agent2_triggered": False,
        }), 200
            
    except Exception as e:
        print(f"❌ Erreur lors de la validation du talent card: {e}")
        return jsonify({"error": str(e)}), 500


def _get_talent_card_pdf_bytes(db_candidate_id: int, lang: str | None = None):
    """
    Récupère le PDF Talent Card généré par le HTML, stocké dans Supabase Storage.
    """
    if supabase_db is None:
        return None, None

    try:
        resp = (
            supabase_db.table("candidates")
            .select("candidate_uuid, id_agent")
            .eq("id", db_candidate_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
    except Exception as e:
        print(f"⚠️ Erreur Supabase lors de la récupération des infos Talent Card pour candidat {db_candidate_id}: {e}")
        row = None

    if not row:
        return None, None

    candidate_uuid = row.get("candidate_uuid")
    id_agent = row.get("id_agent")

    prefix = get_candidate_minio_prefix(db_candidate_id)
    # Noms possibles – on priorise selon la langue demandée
    candidates_names: list[str] = []
    if candidate_uuid:
        if (lang or "").lower() == "en":
            candidates_names.extend(
                [
                    f"{prefix}talentcard_html_{candidate_uuid}_en.pdf",
                    f"{prefix}talentcard_html_{candidate_uuid}.pdf",
                ]
            )
        else:
            candidates_names.extend(
                [
                    f"{prefix}talentcard_html_{candidate_uuid}.pdf",
                    f"{prefix}talentcard_html_{candidate_uuid}_en.pdf",
                ]
            )
    if id_agent:
        candidates_names.append(f"{prefix}talentcard_html_{id_agent}.pdf")

    try:
        storage = get_supabase_storage()
        for name in candidates_names:
            try:
                success, pdf_bytes, _ = storage.download_file(name)
                if success and pdf_bytes:
                    # Nom de téléchargement basé sur candidate_uuid ou id_agent
                    download_name = f"talentcard_{candidate_uuid or id_agent}.pdf"
                    return pdf_bytes, download_name
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ Supabase Storage talentcard_html PDF: {e}")

    return None, None


@app.route("/talentcard/<db_candidate_id>/download", methods=["GET"])
def download_talent_card(db_candidate_id):
    """
    Télécharge le talent card en PDF (nouvelle version HTML si disponible, sinon ancienne version).
    """
    try:
        try:
            db_id = int(db_candidate_id)
        except (TypeError, ValueError):
            return jsonify({"error": "ID candidat invalide"}), 400

        pdf_bytes, file_name = _get_talent_card_pdf_bytes(db_id)
        if not pdf_bytes:
            return jsonify({"error": "Fichier Talent Card PDF introuvable"}), 404

        return send_file(
            BytesIO(pdf_bytes),
            as_attachment=True,
            download_name=file_name or "talentcard.pdf",
            mimetype="application/pdf",
        )
    except Exception as e:
        print(f"❌ Erreur lors du téléchargement Talent Card: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/talentcard/<db_candidate_id>/preview", methods=["GET"])
def preview_talent_card_pdf(db_candidate_id):
    """
    Affiche le PDF de la Talent Card pour prévisualisation (nouvelle version HTML si disponible).
    Sans ?raw=1 : retourne une page HTML (favicon TAP + iframe) pour que l'onglet affiche l'icône TAP.
    Avec ?raw=1 : retourne le PDF brut (pour l'iframe).
    """
    if not request.args.get("raw"):
        pdf_url = _build_pdf_preview_url()
        return _pdf_preview_html_wrapper("Talent Card - Aperçu", pdf_url)
    try:
        try:
            db_id = int(db_candidate_id)
        except (TypeError, ValueError):
            return jsonify({"error": "ID candidat invalide"}), 400

        lang = (request.args.get("lang") or "").lower() or None
        pdf_bytes, file_name = _get_talent_card_pdf_bytes(db_id, lang=lang)
        if not pdf_bytes:
            return jsonify({"error": "Fichier Talent Card PDF introuvable"}), 404

        return send_file(
            BytesIO(pdf_bytes),
            as_attachment=False,
            download_name=file_name or "talentcard.pdf",
            mimetype="application/pdf",
        )
    except Exception as e:
        print(f"❌ Erreur prévisualisation Talent Card PDF: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/preview", methods=["GET"])
def preview_corrected_cv_pdf(candidate_uuid):
    """
    Affiche le PDF du CV corrigé pour prévisualisation dans le navigateur.
    Sans ?raw=1 : retourne une page HTML (favicon TAP + iframe) pour que l'onglet affiche l'icône TAP.
    Avec ?raw=1 : retourne le PDF brut (pour l'iframe ou le téléchargement).
    
    Query params:
        version: Numéro de version (optionnel, utilise la dernière si non fourni)
        db_candidate_id: ID du candidat en base de données (optionnel)
        lang: "fr" ou "en" (défaut "fr") — correspond aux fichiers MinIO cv_{uuid}.pdf / cv_{uuid}_en.pdf
        raw: si présent, retourne le PDF directement (utilisé par l'iframe)
    """
    if not request.args.get("raw"):
        pdf_url = _build_pdf_preview_url()
        return _pdf_preview_html_wrapper("CV - Aperçu", pdf_url)
    try:
        db_candidate_id = request.args.get("db_candidate_id")
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis pour la prévisualisation du CV corrigé"}), 400
        try:
            db_id = int(db_candidate_id)
        except (TypeError, ValueError):
            return jsonify({"error": "ID candidat invalide"}), 400

        version_number = request.args.get("version")
        version_int = None
        if version_number:
            try:
                version_int = int(version_number)
            except ValueError:
                return jsonify({"error": "version invalide"}), 400

        lang = (request.args.get("lang") or "fr").lower()
        if lang not in ("fr", "en"):
            lang = "fr"
        pdf_bytes, file_name = _download_corrected_cv_from_minio(db_id, candidate_uuid, version_int, lang=lang)
        if not pdf_bytes:
            return jsonify({"error": "Fichier CV corrigé PDF introuvable"}), 404

        from flask import Response

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={file_name or 'cv.pdf'}"
            },
        )
    except Exception as e:
        print(f"❌ Erreur lors de la prévisualisation du PDF: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/download", methods=["GET"])
def download_corrected_cv(candidate_uuid):
    """
    Télécharge le CV corrigé (agent 2) en PDF. 
    Si version_number est fourni dans les query params, télécharge cette version spécifique.
    Sinon, télécharge la dernière version approuvée ou la dernière version disponible.
    lang: "fr" ou "en" (défaut "fr").
    """
    try:
        version_number = request.args.get("version_number")
        db_candidate_id = request.args.get("db_candidate_id")
        lang = (request.args.get("lang") or "fr").lower()
        if lang not in ("fr", "en"):
            lang = "fr"

        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id manquant"}), 400
        try:
            db_id = int(db_candidate_id)
        except (TypeError, ValueError):
            return jsonify({"error": "ID candidat invalide"}), 400

        version_int = None
        if version_number:
            try:
                version_int = int(version_number)
            except ValueError:
                return jsonify({"error": "version_number invalide"}), 400

        pdf_bytes, file_name = _download_corrected_cv_from_minio(db_id, candidate_uuid, version_int, lang=lang)
        if not pdf_bytes:
            return jsonify({"error": "Fichier CV corrigé PDF introuvable"}), 404

        return send_file(
            BytesIO(pdf_bytes),
            as_attachment=True,
            download_name=file_name or f"cv_{candidate_uuid}.pdf",
            mimetype="application/pdf",
        )
    except Exception as e:
        print(f"❌ Erreur lors du téléchargement du CV corrigé: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/generate", methods=["POST"])
def generate_corrected_cv_after_validation(candidate_uuid):
    """
    Génère le CV corrigé (agent 2) APRÈS la validation du Talent Card.

    Body JSON:
      {
        "db_candidate_id": <int>,
        "talentcard_data": <dict> (optionnel, fourni par n8n)
      }
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id manquant"}), 400

        # Vérifier si le CV corrigé existe déjà (idempotence) — via la table fichiers_versions (Supabase)
        existing = None
        try:
            if supabase_db is not None:
                resp = (
                    supabase_db.table("fichiers_versions")
                    .select("corrected_json_minio_url, corrected_pdf_minio_url")
                    .eq("candidate_id", db_candidate_id)
                    .eq("candidate_uuid", candidate_uuid)
                    .limit(1)
                    .execute()
                )
                existing = resp.data[0] if resp.data else None
        except Exception as e:
            print(f"⚠️  Erreur lors de la vérification d'idempotence fichiers_versions (Supabase): {e}")

        if existing and (existing.get("corrected_json_minio_url") or existing.get("corrected_pdf_minio_url")):
            print(f"ℹ️  CV corrigé existe déjà pour candidate_uuid={candidate_uuid}, retour du JSON Storage")
            corrected_minio = {
                "corrected_cv_url": existing.get("corrected_pdf_minio_url"),
                "corrected_cv_html_url": None,
                "corrected_json_url": existing.get("corrected_json_minio_url"),
                "corrected_pdf_url": existing.get("corrected_pdf_minio_url"),
            }

            existing_json = {}
            try:
                storage = get_supabase_storage()
                if storage and storage.client and existing.get("corrected_json_minio_url"):
                    ok, file_bytes, _ = storage.download_file(existing["corrected_json_minio_url"])
                    if ok and file_bytes:
                        existing_json = json.loads(file_bytes.decode("utf-8"))
            except Exception as e:
                print(f"⚠️ Lecture JSON existant pour already_exists depuis Supabase Storage: {e}")

            corrected_payload = {
                "html_path": None,
                "minio_urls": corrected_minio,
                "download_url": f"/correctedcv/{candidate_uuid}/download",
                "agent_explanation": "🤖 Agent B1 - CV corrigé déjà généré précédemment. Le document est disponible pour téléchargement.",
            }
            if existing_json:
                corrected_payload["Realisations"] = existing_json.get("Realisations") or existing_json.get("realisations") or []
                corrected_payload["Educations"] = existing_json.get("Educations") or existing_json.get("educations") or []
                corrected_payload["corrected_json"] = existing_json

            return jsonify({
                "success": True,
                "message": "CV corrigé déjà généré",
                "corrected": corrected_payload,
                "agent_explanation": corrected_payload.get("agent_explanation", ""),
                "already_exists": True
            }), 200

        # Utiliser talentcard_data du payload si fourni (depuis n8n), sinon charger depuis DB
        if "talentcard_data" in data:
            talentcard_data = data["talentcard_data"]
            print("✅ Utilisation du talentcard_data fourni via n8n")
        else:
            # Reconstruire le talentcard depuis la base (incluant corrections appliquées)
            talentcard_data = _load_talentcard_from_db(db_candidate_id)
            if not talentcard_data:
                return jsonify({"error": "Candidat introuvable"}), 404

        # Télécharger le CV original depuis MinIO + extraire du texte pour aider l'agent B1
        cv_text_for_agent2, _ = _get_candidate_cv_text(db_candidate_id)

        # Récupérer les commentaires de feedback précédents si version > 1
        previous_feedback = None
        version_number = 1
        # Avec le nouveau schéma (fichiers_versions sans versionning explicite),
        # on garde version_number à 1 et on ne lit plus corrected_cv_versions.

        corrected = _generate_corrected_cv_from_talentcard(
            talentcard_data,
            db_candidate_id=int(db_candidate_id),
            candidate_uuid=candidate_uuid,
            cv_text=cv_text_for_agent2,
            feedback_comments=previous_feedback,
            version_number=version_number,
        )

        # Ne plus déclencher Agent 3 (n8n) automatiquement après génération du CV.
        # Agent 3 ne se lance que lorsque l'utilisateur clique "Démarrer la collecte" sur la page Chatbot
        # (appel direct à /agent3/<candidate_uuid>/process).

        # L'explication de l'agent B1 est déjà incluse dans `corrected` via `_generate_corrected_cv_from_talentcard`
        return jsonify({
            "success": True, 
            "corrected": corrected,
            "agent_explanation": corrected.get("agent_explanation", "")  # Explication de l'Agent B1
        }), 200
    except Exception as e:
        print(f"❌ Erreur génération CV corrigé (post-validation): {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/validate", methods=["POST"])
def validate_corrected_cv(candidate_uuid):
    """
    Valide ou rejette le CV corrigé avec possibilité d'ajouter des commentaires.
    
    Body JSON:
    {
        "status": "approved" | "rejected" | "needs_revision",
        "feedback_comment": "Commentaires optionnels pour amélioration",
        "db_candidate_id": <int>,
        "version_number": <int> (optionnel, utilise la dernière version si non fourni)
    }
    """
    try:
        data = request.get_json() or {}
        status = data.get("status")
        feedback_comment = data.get("feedback_comment", "")
        db_candidate_id = data.get("db_candidate_id")
        version_number = data.get("version_number")

        if not status or status not in ["approved", "rejected", "needs_revision"]:
            return jsonify({"error": "status invalide. Doit être 'approved', 'rejected' ou 'needs_revision'"}), 400

        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id manquant"}), 400

        # Vérifier qu'un CV corrigé existe bien avant d'enregistrer un statut de validation (via Supabase)
        try:
            exists = False
            if supabase_db is not None:
                resp = (
                    supabase_db.table("fichiers_versions")
                    .select("id")
                    .eq("candidate_id", db_candidate_id)
                    .eq("candidate_uuid", candidate_uuid)
                    .not_.is_("corrected_pdf_minio_url", None)
                    .limit(1)
                    .execute()
                )
                exists = bool(resp.data)
            if not exists:
                return jsonify({
                    "error": "NO_CORRECTED_CV",
                    "message": "Aucun CV corrigé n'a été généré pour ce candidat. Veuillez d'abord générer le CV corrigé."
                }), 400
        except Exception as e:
            print(f"⚠️ Erreur vérification existence CV corrigé avant validation (Supabase): {e}")

        # Nouveau schéma : la table corrected_cv_versions a été remplacée par fichiers_versions,
        # qui ne contient plus de colonnes de validation. On ne persiste donc plus le statut
        # de validation dans cette table, mais uniquement dans la mémoire agent (agent_memory).
        # version_number reste informatif (toujours 1 dans le nouveau schéma).
        if not version_number:
            version_number = 1

        # Sauvegarder dans la mémoire des validations pour que l'agent B1 apprenne
        try:
            from agent_memory import save_validation
            save_validation("B1", status, feedback_comment or None, db_candidate_id)
        except Exception as e:
            print(f"⚠️ Mémoire agent (save_validation): {e}")

        response_data = {
            "success": True,
            "message": f"CV corrigé marqué comme {status}",
            "status": status,
            "version_number": version_number,
        }

        # Si rejeté ou nécessite révision, indiquer qu'une nouvelle version peut être générée
        if status in ["rejected", "needs_revision"]:
            response_data["can_regenerate"] = True
            response_data["message"] = f"CV corrigé marqué comme {status}. Vous pouvez générer une nouvelle version avec les améliorations demandées."
        
        return jsonify(response_data), 200

    except Exception as e:
        print(f"❌ Erreur lors de la validation du CV corrigé: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/enrich", methods=["POST"])
def enrich_corrected_cv(candidate_uuid):
    """
    Enrichit le CV corrigé avec des projets (Realisations) et/ou formations (Educations)
    saisis manuellement lorsque l'extraction ne les a pas trouvés.

    Body JSON:
    {
        "db_candidate_id": <int>,
        "realisations": [ { "nom": "", "contexte": "", "stack": "", "detail": "" }, ... ],
        "educations": [ { "degree": "", "school": "", "period": "" }, ... ]
    }
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        realisations = data.get("realisations") or data.get("Realisations") or []
        educations = data.get("educations") or data.get("Educations") or []
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id manquant"}), 400

        # Nouveau schéma : on ne lit plus corrected_cv_versions pour la version.
        # On considère qu'il n'existe qu'une version courante dans fichiers_versions.
        version_number = 1
        corrected = None

        # Télécharger le JSON corrigé existant depuis Supabase Storage
        storage = get_supabase_storage()
        if not storage or not storage.client:
            return jsonify({"error": "Stockage Supabase non configuré"}), 500

        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
        object_name_json = f"{minio_prefix}corrected_data_{candidate_uuid}.json"
        ok, file_bytes, error = storage.download_file(object_name_json)
        if not ok or not file_bytes:
            return jsonify({"error": "Aucun CV corrigé trouvé pour ce candidat. Générez d'abord le CV corrigé."}), 404

        corrected = json.loads(file_bytes.decode("utf-8"))

        if realisations:
            corrected["Realisations"] = [
                {
                    "nom": (r.get("nom") or r.get("name") or "").strip(),
                    "contexte": (r.get("contexte") or r.get("context") or "").strip(),
                    "stack": (r.get("stack") or "").strip(),
                    "detail": (r.get("detail") or r.get("description") or "").strip(),
                }
                for r in realisations
                if isinstance(r, dict) and (r.get("nom") or r.get("name") or r.get("detail") or r.get("description"))
            ]
        if educations:
            corrected["Educations"] = [
                {
                    "degree": (e.get("degree") or e.get("diplome") or e.get("name") or "").strip(),
                    "school": (e.get("school") or e.get("etablissement") or e.get("organization") or "").strip(),
                    "period": (e.get("period") or e.get("annee") or e.get("year") or "").strip(),
                }
                for e in educations
                if isinstance(e, dict) and (e.get("degree") or e.get("diplome") or e.get("school") or e.get("etablissement"))
            ]

        with open(latest_json_path, "w", encoding="utf-8") as f:
            json.dump(corrected, f, ensure_ascii=False, indent=2)

        html_template_path = None
        for p in CV_HTML_TEMPLATE_PATHS:
            if os.path.exists(p):
                html_template_path = p
                break
        if not html_template_path:
            return jsonify({"error": "Template CV HTML introuvable"}), 500

        # Recréer le contexte du CV à partir du JSON corrigé
        cv_context = transform_corrected_json_to_cv_context(corrected)

        # Réinjecter ville, pays et surtout la photo à partir de la Talent Card,
        # comme lors de la génération initiale du CV corrigé.
        try:
            orig = _load_talentcard_from_db(int(db_candidate_id)) or {}
        except Exception:
            orig = {}

        c = cv_context.get("candidate") or {}
        if not (c.get("ville") or "").strip():
            c["ville"] = (orig.get("ville") or "").strip()
        if not (c.get("pays") or "").strip():
            c["pays"] = (orig.get("pays") or "").strip()

        # Récupérer l'URL de l'image (Supabase Storage, utilisable directement)
        try:
            img_url = _get_candidate_image_url(int(db_candidate_id))
        except Exception:
            img_url = None
        if img_url and not (c.get("profile_image_url") or "").strip():
            c["profile_image_url"] = _convert_minio_url_to_proxy(img_url) or img_url

        cv_context["candidate"] = c

        # Rendre le HTML et générer PDF en temporaire, puis uploader vers Supabase Storage (sans disque persistant)
        import tempfile

        with tempfile.TemporaryDirectory(prefix="corrected_cv_enrich_") as tmp_dir:
            out_html_path = os.path.join(tmp_dir, f"cv_{candidate_uuid}.html")
            render_cv_html(html_template_path, cv_context, out_html_path)

            pdf_converted = False
            pdf_bytes = None
            fd, tmp_pdf_path = tempfile.mkstemp(suffix=".pdf")
            os.close(fd)
            try:
                pdf_converted = _convert_cv_html_to_pdf(out_html_path, tmp_pdf_path)
                if pdf_converted and os.path.exists(tmp_pdf_path):
                    with open(tmp_pdf_path, "rb") as f:
                        pdf_bytes = f.read()
            finally:
                try:
                    os.unlink(tmp_pdf_path)
                except Exception:
                    pass

            try:
                with open(out_html_path, "rb") as f:
                    html_bytes = f.read()
                object_name_html = f"{minio_prefix}cv_{candidate_uuid}.html"
                _upload_to_minio_with_logging(
                    None,
                    html_bytes,
                    object_name_html,
                    content_type="text/html; charset=utf-8",
                )

                # Uploader le JSON modifié
                json_bytes = json.dumps(corrected, ensure_ascii=False, indent=2).encode("utf-8")
                object_name_json = f"{minio_prefix}corrected_data_{candidate_uuid}.json"
                _upload_to_minio_with_logging(
                    None,
                    json_bytes,
                    object_name_json,
                    content_type="application/json",
                )

                # Uploader le PDF si disponible
                if pdf_converted and pdf_bytes:
                    object_name_pdf = f"{minio_prefix}cv_{candidate_uuid}.pdf"
                    _upload_to_minio_with_logging(
                        None,
                        pdf_bytes,
                        object_name_pdf,
                        content_type="application/pdf",
                    )
            except Exception as e:
                print(f"⚠️ Erreur upload Storage après enrichissement: {e}")

        return jsonify({
            "success": True,
            "message": "CV corrigé enrichi avec vos projets et formations",
            "corrected": {
                "Realisations": corrected.get("Realisations", []),
                "Educations": corrected.get("Educations", []),
                "corrected_json": corrected,
                "agent_explanation": "✅ Vos projets et formations ont été ajoutés au CV corrigé.",
            },
        }), 200
    except Exception as e:
        print(f"❌ Erreur enrichissement CV corrigé: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/status", methods=["GET"])
def get_corrected_cv_status(candidate_uuid):
    """
    Récupère le statut et les versions du CV corrigé pour un candidat.
    
    Query params:
        db_candidate_id: ID du candidat en base de données
    """
    try:
        db_candidate_id = request.args.get("db_candidate_id")
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id manquant"}), 400

        # Toujours déléguer la génération à l'endpoint /correctedcv/<uuid>/generate
        # (il est déjà idempotent et ne régénère pas si le CV corrigé existe).
        try:
            print(f"ℹ️  Appel automatique de /correctedcv/{candidate_uuid}/generate depuis /status")
            with app.test_request_context(
                f"/correctedcv/{candidate_uuid}/generate",
                method="POST",
                json={"db_candidate_id": int(db_candidate_id)},
            ):
                generate_corrected_cv_after_validation(candidate_uuid)
        except Exception as e:
            print(f"⚠️  Erreur auto-génération CV corrigé depuis /status: {e}")

        # Puis lire l'état actuel des versions et de la validation via Supabase
        rows = []
        validation_row = None
        try:
            if supabase_db is not None:
                fv_resp = (
                    supabase_db.table("fichiers_versions")
                    .select(
                        "id, candidate_id, candidate_uuid, "
                        "corrected_json_minio_url, corrected_pdf_minio_url, "
                        "talent_card_url, cv_ancienne_url, "
                        "long_pdf_url, long_ancienne_url, one_page_pdf_url, "
                        "created_at, updated_at"
                    )
                    .eq("candidate_id", db_candidate_id)
                    .eq("candidate_uuid", candidate_uuid)
                    .execute()
                )
                rows = fv_resp.data or []

                vm_resp = (
                    supabase_db.table("agent_validation_memory")
                    .select("validation_status, feedback_comment, created_at")
                    .eq("agent_id", "B1")
                    .eq("candidate_id", int(db_candidate_id))
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                validation_row = vm_resp.data[0] if vm_resp.data else None
        except Exception as e:
            print(f"⚠️ Erreur lecture statut depuis Supabase: {e}")

        validation_status = (validation_row or {}).get("validation_status") if validation_row else None
        feedback_comment = (validation_row or {}).get("feedback_comment") if validation_row else None

        # Enrichir les versions avec un numéro de version et le statut de validation
        enriched_rows = []
        for idx, row in enumerate(rows):
            row = dict(row)
            row.setdefault("version_number", idx + 1)
            row.setdefault("validation_status", validation_status or "pending")
            if idx == 0 and feedback_comment and not row.get("feedback_comment"):
                row["feedback_comment"] = feedback_comment
            enriched_rows.append(row)

        latest_version = enriched_rows[0] if enriched_rows else None

        return jsonify({
            "success": True,
            "versions": enriched_rows,
            "latest_version": latest_version,
        }), 200

    except Exception as e:
        print(f"❌ Erreur lors de la récupération du statut: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/correctedcv/<candidate_uuid>/regenerate", methods=["POST"])
def regenerate_corrected_cv(candidate_uuid):
    """
    Régénère le CV corrigé en tenant compte des commentaires de feedback.
    
    Body JSON:
    {
        "db_candidate_id": <int>,
        "feedback_comment": "Commentaires pour amélioration" (optionnel si déjà en base)
    }
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        feedback_comment = data.get("feedback_comment")

        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id manquant"}), 400

        # Charger les données du talentcard
        talentcard_data = _load_talentcard_from_db(db_candidate_id)
        if not talentcard_data:
            return jsonify({"error": "Candidat introuvable"}), 404

        # Récupérer la version précédente et ses commentaires
        # Nouveau schéma : plus de table corrected_cv_versions avec versionning explicite.
        # On garde un simple compteur local (1) et on s'appuie sur agent_memory pour mémoriser le feedback.
        version_number = 1
        previous_feedback = feedback_comment

        # Télécharger le CV original pour extraction du texte
        cv_text_for_agent2, _ = _get_candidate_cv_text(db_candidate_id)

        # Générer la nouvelle version
        corrected = _generate_corrected_cv_from_talentcard(
            talentcard_data,
            db_candidate_id=int(db_candidate_id),
            candidate_uuid=candidate_uuid,
            cv_text=cv_text_for_agent2,
            feedback_comments=previous_feedback,
            version_number=version_number,
        )

        return jsonify({
            "success": True,
            "message": f"Nouvelle version {version_number} du CV corrigé générée",
            "corrected": corrected,
        }), 200

    except Exception as e:
        print(f"❌ Erreur lors de la régénération du CV corrigé: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/agent3/files/<path:file_path>", methods=["GET"])
def proxy_minio_file(file_path):
    """
    Proxy pour télécharger des fichiers depuis le stockage (Supabase) sans exposer les credentials.
    Utilisé par n8n pour accéder aux fichiers JSON/DOCX/PDF depuis le stockage.
    
    Args:
        file_path: Chemin du fichier dans MinIO (ex: candidates/31/corrected_data_xxx.json)
    """
    try:
        print(f"🔄 [Proxy] Tentative de téléchargement: {file_path}")
        storage = get_supabase_storage()

        if not storage or not storage.client:
            error_msg = "Client de stockage Supabase non initialisé"
            print(f"❌ [Proxy] {error_msg}")
            return jsonify({"error": error_msg}), 500

        success, file_bytes, error = storage.download_file(file_path)

        if not success:
            error_msg = error or "Fichier introuvable"
            print(f"❌ [Proxy] Erreur téléchargement fichier Storage ({file_path}): {error_msg}")
            
            # Vérifier si c'est une erreur d'accès
            if "AccessDenied" in str(error) or "Forbidden" in str(error):
                return jsonify({
                    "error": "AccessDenied",
                    "message": "Accès refusé au fichier de stockage. Vérifiez les credentials et les permissions du bucket.",
                    "file_path": file_path
                }), 403
            elif "NoSuchKey" in str(error) or "Not Found" in str(error):
                return jsonify({
                    "error": "FileNotFound",
                    "message": f"Fichier introuvable dans le stockage: {file_path}",
                    "file_path": file_path
                }), 404
            else:
                return jsonify({
                    "error": "DownloadError",
                    "message": error_msg,
                    "file_path": file_path
                }), 500
        
        # Déterminer le content-type
        if file_path.endswith(".json"):
            content_type = "application/json"
        elif file_path.endswith(".docx"):
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif file_path.endswith(".pdf"):
            content_type = "application/pdf"
        else:
            content_type = "application/octet-stream"
        
        print(f"✅ [Proxy] Fichier téléchargé avec succès: {file_path} ({len(file_bytes)} bytes)")
        return send_file(
            BytesIO(file_bytes),
            mimetype=content_type,
            as_attachment=False
        )
    except Exception as e:
        error_msg = str(e)
        print(f"❌ [Proxy] Erreur proxy Storage ({file_path}): {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "ProxyError",
            "message": error_msg,
            "file_path": file_path
        }), 500




@app.route("/chatbot/<db_candidate_id>/summary", methods=["GET"])
def get_chatbot_summary(db_candidate_id):
    """
    Récupère un résumé des données collectées par le chatbot.
    
    Query params:
        session_id: UUID de la session (optionnel)
    """
    try:
        session_id = request.args.get("session_id")

        # Nouveau schéma : la table candidate_projects a été supprimée.
        # On ne retourne plus que l'historique de conversation depuis chatbot_conversations (Supabase).
        conversations = []
        try:
            if supabase_db is not None:
                query = (
                    supabase_db.table("chatbot_conversations")
                    .select("message_type, message_content, project_id, created_at, metadata, session_id")
                    .eq("candidate_id", db_candidate_id)
                )
                if session_id:
                    query = query.eq("session_id", session_id)
                resp = query.order("created_at", desc=False).execute()
                conversations = resp.data or []
        except Exception as e:
            print(f"⚠️ Erreur lecture chatbot_conversations depuis Supabase: {e}")
        
        return jsonify({
            "success": True,
            "candidate_id": db_candidate_id,
            "session_id": session_id,
            "projects_count": 0,
            "projects": [],
            "conversations_count": len(conversations),
            "conversations": conversations
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur récupération résumé chatbot: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/chatbot/<db_candidate_id>/projects", methods=["GET"])
def get_candidate_projects(db_candidate_id):
    """
    Récupère tous les projets collectés pour un candidat.
    """
    try:
        # Nouveau schéma : candidate_projects n'existe plus.
        # On retourne simplement une liste vide de projets.
        return jsonify({
            "success": True,
            "candidate_id": db_candidate_id,
            "projects": []
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur récupération projets: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# ENDPOINT AGENT 3 (B2) - GÉNÉRATION DE QUESTIONS AVEC GEMINI
# ============================================================================

@app.route("/agent3/<candidate_uuid>/process", methods=["POST"])
def agent3_process(candidate_uuid):
    """
    Endpoint pour l'Agent 3 (B2) qui génère des questions avec Gemini AI
    pour collecter les informations sur les projets du candidat.
    
    Utilisé par le workflow n8n après la génération de la Talent Card (A1) et du CV corrigé (B1).
    
    Body (JSON):
        db_candidate_id: int (obligatoire)
        id_agent: str (obligatoire)
        a1_output: dict - Output Agent 1 (Talent Card)
        b1_output: dict - Output Agent 2 (CV corrigé)
        talentcard_data: dict (optionnel) - Alias de a1_output
        corrected_cv_data: dict (optionnel) - Alias de b1_output
    
    Returns:
        JSON avec les questions générées et la session ID
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Body JSON requis"}), 400
        
        db_candidate_id = data.get("db_candidate_id")
        id_agent = data.get("id_agent")
        a1_output = data.get("a1_output") or data.get("talentcard_data")
        b1_output = data.get("b1_output") or data.get("corrected_cv_data")
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        if not a1_output or not b1_output:
            return jsonify({
                "error": "a1_output (talentcard_data) et b1_output (corrected_cv_data) sont requis"
            }), 400
        
        from B2.chat.pose_question import generate_questions_with_gemini
        
        # Construire le profil à partir des données A1 et B1
        profile_data = {}
        
        # Extraire les projets depuis b1_output (CV corrigé) ET a1_output (Talent Card)
        # Le CV corrigé utilise "Realisations" (pas "Projects")
        projects = []
        
        # ========== EXTRACTION DEPUIS B1_OUTPUT (CV corrigé) ==========
        # 1. Essayer d'extraire depuis "Realisations" (format du CV corrigé)
        realisations = b1_output.get("Realisations") or b1_output.get("realisations") or []
        if isinstance(realisations, list) and len(realisations) > 0:
            projects = [
                r.get("nom", "") if isinstance(r, dict) else str(r)
                for r in realisations
                if (isinstance(r, dict) and r.get("nom")) or (isinstance(r, str) and r.strip())
            ]
        projects_list = b1_output.get("Projects") or b1_output.get("projects") or []
        if not projects and isinstance(projects_list, list) and len(projects_list) > 0:
            projects = [
                p.get("Name", "") or p.get("name", "") if isinstance(p, dict) else str(p)
                for p in projects_list
                if (isinstance(p, dict) and (p.get("Name") or p.get("name"))) or (isinstance(p, str) and p.strip())
            ]
        experiences_b1 = b1_output.get("Experiences") or b1_output.get("experiences") or b1_output.get("Experience") or b1_output.get("experience") or []
        if not projects and isinstance(experiences_b1, list) and len(experiences_b1) > 0:
            for exp in experiences_b1:
                if isinstance(exp, dict):
                    desc = exp.get("description", "") or exp.get("Description", "") or exp.get("detail", "") or exp.get("Detail", "")
                    title = exp.get("title", "") or exp.get("Title", "") or exp.get("Role", "") or exp.get("role", "")
                    if desc and len(desc) > 20 and title and title not in projects:
                        projects.append(title)
        
        if not projects and isinstance(a1_output, dict):
            experience_a1 = a1_output.get("experience") or a1_output.get("Experience") or []
            if isinstance(experience_a1, list) and len(experience_a1) > 0:
                for exp in experience_a1:
                    if isinstance(exp, dict):
                        role = exp.get("Role", "") or exp.get("role", "") or exp.get("title", "") or exp.get("Title", "")
                        desc = exp.get("description", "") or exp.get("Description", "") or exp.get("detail", "") or exp.get("Detail", "")
                        if role and desc and len(desc) > 20 and role not in projects:
                            projects.append(role)
            realisations_a1 = a1_output.get("realisations") or a1_output.get("Realisations") or []
            if not projects and isinstance(realisations_a1, list) and len(realisations_a1) > 0:
                for r in realisations_a1:
                    if isinstance(r, dict):
                        nom = r.get("nom", "") or r.get("Nom", "") or r.get("name", "") or r.get("Name", "")
                        if nom and nom not in projects:
                            projects.append(nom)
        if not projects:
            titre = b1_output.get("Titre") or b1_output.get("titre") or b1_output.get("Title") or b1_output.get("title")
            if not titre and isinstance(a1_output, dict):
                titre = a1_output.get("Titre de profil") or a1_output.get("titre de profil") or a1_output.get("Title")
            if titre:
                projects = [titre]
        
        # Extraire l'expérience depuis b1_output (format: "Experiences" avec minuscule)
        experience = {}
        experiences_list = b1_output.get("Experiences") or b1_output.get("Experience", [])
        if isinstance(experiences_list, list) and len(experiences_list) > 0:
            exp = experiences_list[0]  # Prendre la première expérience
            experience = {
                "title": exp.get("title") or exp.get("Title", ""),
                "company": exp.get("company") or exp.get("Company", ""),
                "period": exp.get("period") or exp.get("Period", ""),
                "description": exp.get("description") or exp.get("Description", "")
            }
        
        # Extraire l'éducation depuis b1_output (format: "Educations" avec minuscule)
        education = []
        educations_list = b1_output.get("Educations") or b1_output.get("Education", [])
        if isinstance(educations_list, list):
            education = [
                {
                    "degree": (edu.get("degree") or edu.get("Degree", "")) if isinstance(edu, dict) else str(edu),
                    "school": (edu.get("school") or edu.get("School", "")) if isinstance(edu, dict) else "",
                    "period": (edu.get("period") or edu.get("Period", "")) if isinstance(edu, dict) else ""
                }
                for edu in educations_list
            ]
        
        # Construire le profil avec toutes les expériences (pas seulement la première)
        all_experiences = []
        if isinstance(experiences_list, list):
            all_experiences = [
                {
                    "title": exp.get("title") or exp.get("Title", "") or exp.get("Role", "") or exp.get("role", ""),
                    "company": exp.get("company") or exp.get("Company", "") or exp.get("entreprise", "") or exp.get("Entreprise", ""),
                    "period": exp.get("period") or exp.get("Period", "") or exp.get("periode", "") or exp.get("Periode", ""),
                    "description": exp.get("description") or exp.get("Description", "") or exp.get("detail", "") or exp.get("Detail", "")
                }
                for exp in experiences_list
                if isinstance(exp, dict)
            ]
        
        if isinstance(a1_output, dict):
            experience_a1 = a1_output.get("experience") or a1_output.get("Experience") or []
            if isinstance(experience_a1, list) and len(experience_a1) > 0:
                for exp_a1 in experience_a1:
                    if isinstance(exp_a1, dict):
                        # Vérifier si cette expérience n'est pas déjà dans la liste
                        role_a1 = exp_a1.get("Role", "") or exp_a1.get("role", "")
                        title_a1 = exp_a1.get("title", "") or exp_a1.get("Title", "")
                        # Ajouter si elle n'existe pas déjà
                        exists = any(
                            (e.get("title") == role_a1 or e.get("title") == title_a1) 
                            for e in all_experiences
                        )
                        if not exists:
                            all_experiences.append({
                                "title": role_a1 or title_a1,
                                "company": exp_a1.get("entreprise", "") or exp_a1.get("Entreprise", "") or exp_a1.get("company", "") or exp_a1.get("Company", ""),
                                "period": exp_a1.get("periode", "") or exp_a1.get("Periode", "") or exp_a1.get("period", "") or exp_a1.get("Period", ""),
                                "description": exp_a1.get("description", "") or exp_a1.get("Description", "") or exp_a1.get("detail", "") or exp_a1.get("Detail", "")
                            })
        
        # Construire le profil
        profile_data = {
            "experience": experience,  # Première expérience (pour compatibilité)
            "experiences": all_experiences,  # Toutes les expériences (b1 + a1)
            "education": education,
            "projects": projects,
            "realisations": b1_output.get("Realisations", []) or b1_output.get("realisations", [])  # Ajouter aussi les réalisations complètes
        }
        
        talentcard_data = a1_output
        
        # Générer les questions avec Gemini
        result = generate_questions_with_gemini(profile_data, talentcard_data)
        
        if not result["success"]:
            error_type = result.get("error_type", "unknown_error")
            error_msg = result.get("error", "Erreur inconnue")
            
            # Code HTTP selon le type d'erreur
            if error_type == "quota_exceeded":
                http_status = 429  # Too Many Requests
            elif error_type == "auth_error":
                http_status = 401  # Unauthorized
            elif error_type == "timeout":
                http_status = 504  # Gateway Timeout
            else:
                http_status = 500  # Internal Server Error
            
            print(f"❌ [Agent3] Erreur ({error_type}): {error_msg}")
            
            return jsonify({
                "success": False,
                "error": error_msg,
                "error_type": error_type,
                "candidate_uuid": candidate_uuid,
                "db_candidate_id": db_candidate_id,
                "suggestion": (
                    "Attendez quelques minutes et réessayez" if error_type == "quota_exceeded"
                    else "Vérifiez votre configuration" if error_type == "auth_error"
                    else "Réessayez plus tard"
                )
            }), http_status
        
        questions = result.get("questions", [])
        
        # Vérifier si des questions ont été générées
        if not questions or len(questions) == 0:
            return jsonify({
                "success": False,
                "error": f"Aucune question générée. Aucun projet identifié dans le CV (projets trouvés: {len(projects)}). Veuillez vérifier que votre CV contient des projets ou réalisations.",
                "candidate_uuid": candidate_uuid,
                "db_candidate_id": db_candidate_id,
                "projects_identified": len(projects),
                "projects": projects,
                "questions": [],
                "total_questions": 0,
                "suggestion": "Vérifiez que votre CV contient des sections 'Projets', 'Réalisations' ou des expériences avec des descriptions détaillées de projets."
            }), 400
        
        # Générer un session_id unique pour cette session
        session_id = str(uuid.uuid4())
        
        # Sauvegarder la session dans la base de données (optionnel)
        # Pour l'instant, on retourne juste les questions
        
        response_data = {
            "success": True,
            "candidate_uuid": candidate_uuid,
            "db_candidate_id": db_candidate_id,
            "id_agent": id_agent,
            "chatbot_started": True,
            "session_id": session_id,
            "projects_identified": len(projects),
            "projects": projects,  # Liste des projets identifiés
            "questions": questions,
            "total_questions": len(questions),
            "first_question": questions[0] if questions else None,
            "message": f"Bonjour ! J'ai analysé votre CV et identifié {len(projects)} projet(s). J'ai généré {len(questions)} question(s) pour collecter les informations nécessaires à votre portfolio.",
            "processed_at": datetime.now().isoformat(),
            "note": "Les questions ont été générées avec succès. Utilisez l'endpoint /agent3/<candidate_uuid>/save-responses pour sauvegarder les réponses."
        }
        
        print(f"✅ [Agent3] {len(questions)} questions générées avec succès pour candidate_uuid={candidate_uuid}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ [Agent3] Erreur lors du traitement: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "candidate_uuid": candidate_uuid
        }), 500


# ============================================================================
# ENDPOINT AGENT 3 - SAUVEGARDE DES RÉPONSES
# ============================================================================

def group_questions_by_project(questions, answers):
    """
    Groupe les questions et réponses par projet en analysant les IDs.
    
    Les IDs peuvent être au format:
    - proj1_title, proj1_github, proj2_title, etc.
    - exp1_title, exp1_description, exp2_title, etc.
    - project1_title, project2_title, etc.
    
    Returns:
        dict: {project_key: {"questions": [...], "answers": {...}, "project_name": str}}
    """
    projects = {}
    
    for question in questions:
        if not question or not question.get("id"):
            continue
        
        q_id = question["id"]
        answer = answers.get(q_id, "")
        
        # Identifier le projet depuis l'ID
        # Format attendu: proj1_title, exp1_description, project1_github, etc.
        project_key = None
        project_name = None
        
        # Patterns pour identifier le projet
        patterns = [
            r'^(proj|project|exp)(\d+)_',  # proj1_title, exp2_description
            r'^(\w+)_(\d+)_',  # project_1_title
        ]
        
        for pattern in patterns:
            match = re.match(pattern, q_id, re.IGNORECASE)
            if match:
                prefix = match.group(1).lower()
                num = match.group(2)
                project_key = f"{prefix}{num}"
                
                # Essayer d'extraire le nom du projet depuis la question
                if "title" in q_id.lower() and answer:
                    project_name = answer.strip()[:100]  # Limiter la longueur
                elif "nom" in q_id.lower() and answer:
                    project_name = answer.strip()[:100]
                break
        
        # Si pas de pattern trouvé, essayer d'extraire depuis le texte de la question
        if not project_key:
            # Chercher des mentions de projet dans le texte
            q_text = question.get("text", "")
            match = re.search(r"projet\s+['\"]([^'\"]+)['\"]", q_text, re.IGNORECASE)
            if match:
                project_name = match.group(1)
                # Créer une clé basée sur le nom
                project_key = re.sub(r'[^a-zA-Z0-9]', '_', project_name.lower())[:50]
        
        # Si toujours pas de projet identifié, essayer de trouver le projet depuis le texte de la question
        if not project_key:
            # Chercher des mentions de projet dans le texte de la question
            q_text = question.get("text", "").lower()
            # Chercher des patterns comme "projet X", "le projet Y", etc.
            match = re.search(r"(?:projet|project)\s+['\"]?([^'\"\?\.]+)['\"]?", q_text, re.IGNORECASE)
            if match:
                potential_name = match.group(1).strip()
                if len(potential_name) > 3:  # Nom valide
                    project_name = potential_name
                    project_key = re.sub(r'[^a-zA-Z0-9]', '_', potential_name.lower())[:50]
        
        # Si toujours pas de projet identifié, utiliser un projet par défaut
        if not project_key:
            project_key = "default"
            project_name = project_name or "Projet principal"
        
        # Initialiser le projet s'il n'existe pas
        if project_key not in projects:
            projects[project_key] = {
                "questions": [],
                "answers": {},
                "project_name": project_name or f"Projet {project_key}"
            }
        
        # Ajouter la question et la réponse
        projects[project_key]["questions"].append(question)
        if answer:
            projects[project_key]["answers"][q_id] = answer
    
    return projects


@app.route("/agent3/<candidate_uuid>/save-responses", methods=["POST"])
def agent3_save_responses(candidate_uuid):
    """
    Sauvegarde les réponses aux questions générées par Agent 3.
    Extrait les liens, télécharge les images et sauvegarde tout dans la base de données / stockage.
    Groupe automatiquement les questions par projet et sauvegarde chaque projet séparément.
    
    Body (JSON):
        db_candidate_id: int (obligatoire)
        project_name: str (optionnel) - Nom du projet par défaut si un seul projet
        answers: dict (obligatoire) - {question_id: answer}
        questions: list (obligatoire) - Liste des questions avec leurs IDs
        projects_list: list (optionnel) - Liste des projets identifiés
    
    Returns:
        JSON avec le résultat de la sauvegarde (peut inclure plusieurs projets)
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Body JSON requis"}), 400
        
        db_candidate_id = data.get("db_candidate_id")
        default_project_name = data.get("project_name")
        answers = data.get("answers", {})
        questions = data.get("questions", [])
        projects_list = data.get("projects_list", [])
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        if not answers:
            return jsonify({"error": "answers est requis (ne peut pas être vide)"}), 400
        
        # Importer les fonctions de sauvegarde (implémentées avec Supabase / stockage)
        from B2.chat.save_responses import save_project_responses, save_chat_responses_to_minio
        
        print(f"🔄 [Agent3] Sauvegarde des réponses pour candidate_uuid={candidate_uuid}")
        print(f"🔄 [Agent3] Nombre de questions: {len(questions)}, Nombre de réponses: {len(answers)}")
        
        # ✅ Sauvegarder toutes les réponses dans le stockage (une seule fois pour tous les projets)
        storage_success, storage_url, storage_error = save_chat_responses_to_minio(
            db_candidate_id, answers, questions, projects_list
        )
        if storage_success:
            print(f"✅ [Agent3] Réponses sauvegardées dans le stockage: {storage_url}")
        else:
            print(f"⚠️  [Agent3] Erreur sauvegarde stockage (continuons quand même): {storage_error}")
        
        # Grouper les questions par projet
        projects_grouped = group_questions_by_project(questions, answers)
        
        print(f"🔄 [Agent3] Projets identifiés: {len(projects_grouped)}")
        for key, proj_data in projects_grouped.items():
            print(f"  - {key}: {len(proj_data['questions'])} questions, nom: {proj_data['project_name']}")
        
        # Sauvegarder chaque projet séparément
        saved_projects = []
        errors = []
        
        for project_key, proj_data in projects_grouped.items():
            project_name = proj_data["project_name"]
            project_answers = proj_data["answers"]
            project_questions = proj_data["questions"]
            
            # Si pas de nom de projet, utiliser le nom par défaut ou générer un nom
            if not project_name or project_name == f"Projet {project_key}" or project_name == "Projet principal":
                # Essayer d'extraire l'index du projet depuis la clé
                idx_match = re.search(r'(\d+)', project_key)
                if idx_match and projects_list and len(projects_list) > 0:
                    idx = int(idx_match.group(1))
                    # Les indices commencent généralement à 1 (proj1, proj2, etc.)
                    if idx > 0 and idx <= len(projects_list):
                        project_name = projects_list[idx - 1]
                    elif len(projects_list) == 1:
                        # Si un seul projet, l'utiliser
                        project_name = projects_list[0]
                
                # Si toujours pas de nom, utiliser le nom par défaut
                if not project_name or project_name == f"Projet {project_key}" or project_name == "Projet principal":
                    if default_project_name:
                        project_name = default_project_name
                    elif projects_list and len(projects_list) > 0:
                        # Utiliser le premier projet de la liste
                        project_name = projects_list[0]
                    else:
                        project_name = f"Projet {project_key}"
            
            print(f"💾 [Agent3] Sauvegarde du projet: {project_name}")
            
            success, project_id, error = save_project_responses(
                db_candidate_id,
                project_name,
                project_answers,
                project_questions,
                projects_list
            )
            
            # Après simplification de save_project_responses, on considère que
            # la sauvegarde MinIO/Storage suffit ; on ne propage plus d'échec global.
            if success:
                saved_projects.append({
                    "project_id": project_id,
                    "project_name": project_name,
                    "questions_count": len(project_questions)
                })
            elif error:
                print(f"⚠️  [Agent3] Erreur sauvegarde projet '{project_name}': {error}")
                errors.append({
                    "project_name": project_name,
                    "error": error
                })
        
        return jsonify({
            "success": True,
            "candidate_uuid": candidate_uuid,
            "db_candidate_id": db_candidate_id,
            "projects_saved": len(saved_projects),
            "projects": saved_projects,
            "errors": errors if errors else None,
            "message": f"{len(saved_projects)} projet(s) sauvegardé(s) avec succès" + (f" ({len(errors)} erreur(s))" if errors else "")
        }), 200
        
    except Exception as e:
        print(f"❌ [Agent3] Erreur lors de la sauvegarde des réponses: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "candidate_uuid": candidate_uuid
        }), 500


@app.route("/agent3/<candidate_uuid>/get-chat-responses", methods=["GET"])
def agent3_get_chat_responses(candidate_uuid):
    """
    Récupère les réponses du chat depuis le stockage pour un candidat.
    
    Query params:
        db_candidate_id: int (obligatoire)
    
    Returns:
        JSON avec les réponses du chat
    """
    try:
        db_candidate_id = request.args.get("db_candidate_id", type=int)
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        from B2.chat.save_responses import get_chat_responses_from_minio
        
        success, chat_data, error = get_chat_responses_from_minio(db_candidate_id)
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Impossible de récupérer les réponses"
            }), 404
        
        return jsonify({
            "success": True,
            "candidate_uuid": candidate_uuid,
            "db_candidate_id": db_candidate_id,
            "chat_data": chat_data
        }), 200
        
    except Exception as e:
        print(f"❌ [Agent3] Erreur lors de la récupération des réponses: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "candidate_uuid": candidate_uuid
        }), 500


@app.route("/agent3/<candidate_uuid>/upload-image", methods=["POST"])
def agent3_upload_image(candidate_uuid):
    """
    Upload une image directement (pas depuis une URL) pour un projet.
    
    Form Data:
        db_candidate_id: int (obligatoire)
        project_name: str (obligatoire)
        image: file (obligatoire) - Fichier image
    
    Returns:
        JSON avec l'URL de stockage de l'image
    """
    try:
        db_candidate_id = request.form.get("db_candidate_id")
        project_name = request.form.get("project_name")
        image_file = request.files.get("image")
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        if not project_name:
            return jsonify({"error": "project_name est requis"}), 400
        if not image_file:
            return jsonify({"error": "image est requis"}), 400
        
        # Lire le fichier
        image_bytes = image_file.read()
        
        # Déterminer l'extension
        filename = image_file.filename or 'image.jpg'
        extension = os.path.splitext(filename)[1] or '.jpg'
        
        # Nom de l'objet dans le stockage
        safe_project_name = re.sub(r'[^a-zA-Z0-9_-]', '_', project_name)[:50]
        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
        object_name = f"{minio_prefix}projects/{safe_project_name}/uploaded_{filename}"
        
        content_type = image_file.content_type or 'image/jpeg'
        success, minio_url, error = _upload_to_minio_with_logging(
            None,
            image_bytes,
            object_name,
            content_type=content_type
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de l'upload vers le stockage"
            }), 500
        
        # Nouveau schéma : candidate_projects a été supprimée.
        # On ne fait plus de mise à jour en base pour les projets, on retourne seulement l'URL de stockage.
        return jsonify({
            "success": True,
            "minio_url": minio_url,
            "object_name": object_name,
            "message": "Image uploadée avec succès"
        }), 200
        
    except Exception as e:
        print(f"❌ [Agent3] Erreur lors de l'upload d'image: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/agent3/<candidate_uuid>/upload-media", methods=["POST"])
def agent3_upload_media(candidate_uuid):
    """
    Upload une image ou une vidéo directement pour un projet.
    
    Form Data:
        db_candidate_id: int (obligatoire)
        project_name: str (obligatoire)
        question_id: str (optionnel) - ID de la question associée
        media: file (obligatoire) - Fichier image ou vidéo
    
    Returns:
        JSON avec l'URL de stockage du média
    """
    try:
        db_candidate_id = request.form.get("db_candidate_id")
        project_name = request.form.get("project_name")
        question_id = request.form.get("question_id")
        media_file = request.files.get("media")
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        if not project_name:
            return jsonify({"error": "project_name est requis"}), 400
        if not media_file:
            return jsonify({"error": "media est requis"}), 400
        
        # Lire le fichier
        media_bytes = media_file.read()
        
        # Vérifier le type de fichier
        filename = media_file.filename or 'file'
        content_type = media_file.content_type or 'application/octet-stream'
        
        # Déterminer si c'est une image ou une vidéo
        is_image = content_type.startswith('image/')
        is_video = content_type.startswith('video/')
        
        # Vérifier aussi par extension
        extension = os.path.splitext(filename)[1].lower()
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
        video_extensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
        
        if extension in image_extensions:
            is_image = True
        elif extension in video_extensions:
            is_video = True
        
        if not is_image and not is_video:
            return jsonify({
                "success": False,
                "error": "Le fichier doit être une image ou une vidéo"
            }), 400
        
        # Nom de l'objet dans le stockage
        safe_project_name = re.sub(r'[^a-zA-Z0-9_-]', '_', project_name)[:50]
        timestamp = int(datetime.now().timestamp())
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)[:100]
        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
        object_name = f"{minio_prefix}projects/{safe_project_name}/media_{timestamp}_{safe_filename}"

        success, minio_url, error = _upload_to_minio_with_logging(
            None,
            media_bytes,
            object_name,
            content_type=content_type
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de l'upload vers le stockage"
            }), 500
        
        # Nouveau schéma : candidate_projects a été supprimée.
        # On ne met plus à jour de table de projets, on retourne seulement l'URL de stockage.
        
        return jsonify({
            "success": True,
            "minio_url": minio_url,
            "object_name": object_name,
            "file_type": "image" if is_image else "video",
            "filename": filename,
            "message": f"{'Image' if is_image else 'Vidéo'} uploadée avec succès"
        }), 200
        
    except Exception as e:
        print(f"❌ [Agent3] Erreur lors de l'upload de média: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Erreur lors de l'upload: {str(e)}"
        }), 500


# ============================================================================
# ENDPOINTS CHATBOT PORTFOLIO (SIMPLE)
# ============================================================================

@app.route("/portfolio/start", methods=["POST"])
def start_portfolio_session():
    """
    Démarre une nouvelle session de chatbot portfolio.
    
    Body (JSON):
        candidate_id: int (obligatoire)
        extracted_data: dict (optionnel) - Données extraites du CV + Talent Card
    """
    try:
        data = request.get_json()
        candidate_id = data.get("candidate_id")
        extracted_data = data.get("extracted_data", {})
        
        if not candidate_id:
            return jsonify({"error": "candidate_id is required"}), 400
        
        from B2.chat.portfolio_session import PortfolioSession
        from B2.chat.question_logic import QuestionLogic
        
        # Créer la session
        session = PortfolioSession.create(candidate_id, extracted_data)
        
        # Obtenir la première question
        next_question = QuestionLogic.get_next_question(session)
        
        if next_question:
            question_key, question_text = next_question
            session.set_current_question(question_key, question_text)
        
        # Récupérer l'état
        state = session.get_state()
        
        return jsonify({
            "success": True,
            "session_id": session.session_id,
            "question": question_text if next_question else None,
            "is_complete": state["is_complete"],
            "profile": state["profile"],
            "missing_fields": state["missing_fields"]
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur démarrage session portfolio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/portfolio/<session_id>/message", methods=["POST"])
def send_portfolio_message(session_id):
    """
    Envoie un message (réponse) au chatbot et obtient la question suivante.
    
    Body (JSON):
        message: str (obligatoire) - Réponse de l'utilisateur
    """
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"error": "message is required"}), 400
        
        from B2.chat.portfolio_session import PortfolioSession
        from B2.chat.question_logic import QuestionLogic
        
        # Charger la session
        session = PortfolioSession.load(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        state = session.get_state()
        
        # Si la session est déjà complète, on ne pose plus de questions
        if state["is_complete"]:
            return jsonify({
                "success": True,
                "session_id": session_id,
                "question": None,
                "is_complete": True,
                "message": "Toutes les informations ont été collectées !",
                "profile": state["profile"]
            }), 200
        
        # Extraire l'information de la réponse
        current_question_key = state["current_question_key"]
        if current_question_key:
            extracted_data = QuestionLogic.extract_answer(current_question_key, user_message)
            
            # Mettre à jour le profil seulement si on a extrait des données valides
            if extracted_data:
                session.update_profile(extracted_data)
                # IMPORTANT: persist the answer so next question advances
                try:
                    session.add_answer(current_question_key, user_message)
                    session.mark_filled(current_question_key)
                except Exception:
                    pass
        
        # Obtenir la prochaine question
        next_question = QuestionLogic.get_next_question(session)
        
        if next_question:
            question_key, question_text = next_question
            session.set_current_question(question_key, question_text)
        
        # Récupérer l'état mis à jour
        updated_state = session.get_state()
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "question": question_text if next_question else None,
            "is_complete": updated_state["is_complete"],
            "profile": updated_state["profile"],
            "missing_fields": updated_state["missing_fields"],
            "filled_field": current_question_key if current_question_key else None
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur traitement message portfolio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/portfolio/<session_id>/state", methods=["GET"])
def get_portfolio_session_state(session_id):
    """
    Récupère l'état actuel d'une session de portfolio.
    """
    try:
        from B2.chat.portfolio_session import PortfolioSession
        
        session = PortfolioSession.load(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        state = session.get_state()
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "state": state
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur récupération état session: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/portfolio/<candidate_uuid>/generate", methods=["POST"])
def generate_portfolio(candidate_uuid):
    """
    Génère le contenu du portfolio à partir des réponses du chatbot et du CV.
    
    Body (JSON):
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
        template_path: str (optionnel) - Chemin vers le template PPTX
        output_pptx: bool (optionnel) - Si True, génère aussi le fichier PPTX
    
    Returns:
        JSON avec le contenu du portfolio généré
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        lang = (data.get("lang") or "fr").strip().lower()
        if lang not in ("fr", "en"):
            lang = "fr"
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        from B2.agent_portfolio import generate_portfolio_content
       
        
        print(f"🔄 Génération du portfolio pour candidate_uuid={candidate_uuid}, db_candidate_id={db_candidate_id}, lang={lang}")
        
        # Générer le contenu du portfolio (dans la langue choisie) — portfolio long = CV original
        success, portfolio_data, error = generate_portfolio_content(
            db_candidate_id,
            output_json_path=None,
            use_original_cv=True,
            lang=lang
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de la génération du portfolio"
            }), 500
        
        # Récupérer l'URL de l'image du candidat depuis la base de données
        candidate_image_url = _get_candidate_image_url(db_candidate_id)
        if candidate_image_url:
            print(f"✅ Image candidat trouvée: {candidate_image_url}")
        
        # Préparer la réponse
        response_data = {
            "success": True,
            "candidate_uuid": candidate_uuid,
            "db_candidate_id": db_candidate_id,
            "portfolio_content": portfolio_data,
            "candidate_image_url": candidate_image_url,
            "json_path": None
        }
        
        # Upload éventuel du JSON vers le stockage (directement depuis l'objet Python)
        try:
            minio_prefix = get_candidate_minio_prefix(db_candidate_id)
            object_name = f"{minio_prefix}portfolio_{candidate_uuid}.json"
            json_bytes = json.dumps(portfolio_data, ensure_ascii=False, indent=2).encode("utf-8")
            success, url, _ = _upload_to_minio_with_logging(
                None,
                json_bytes,
                object_name,
                content_type="application/json"
            )
            if success:
                response_data["json_minio_url"] = url
        except Exception as e:
            print(f"⚠️  Erreur upload JSON vers le stockage: {e}")
        
        # Générer le PDF en arrière-plan après la génération du JSON
        try:
            from B2.agent_portfolio import transform_portfolio_data_for_template, convert_html_to_pdf
            from jinja2 import Template
            import threading
            
            def generate_pdf_background():
                """Génère le PDF en arrière-plan"""
                try:
                    print(f"🔄 [PDF Thread] Démarrage génération PDF en arrière-plan pour candidate_id={db_candidate_id}")
                    print(f"🔄 [PDF Thread] candidate_uuid={candidate_uuid}")
                    
                    # 1. Récupérer les données du candidat depuis la base de données
                    candidate_data = _get_candidate_info(
                        db_candidate_id,
                        ['image_minio_url', 'email', 'phone', 'titre_profil', 'annees_experience']
                    )
                    minio_image_url = candidate_data.get("image_minio_url")
                    candidate_img_url = _convert_minio_url_to_proxy(minio_image_url)
                    candidate_email = candidate_data.get("email")
                    candidate_phone = candidate_data.get("phone")
                    candidate_job_title = candidate_data.get("titre_profil")
                    candidate_years_experience = candidate_data.get("annees_experience")
                    
                    # 2. Transformer les données pour le template
                    template_data = transform_portfolio_data_for_template(
                        portfolio_data,
                        candidate_image_url=candidate_img_url,
                        candidate_email=candidate_email,
                        candidate_phone=candidate_phone,
                        candidate_job_title=candidate_job_title,
                        candidate_years_experience=candidate_years_experience
                    )
                    
                    # 3. Convertir les URLs MinIO des images de projets en URLs proxy
                    if template_data.get("candidate") and template_data["candidate"].get("projects"):
                        template_data["candidate"]["projects"] = _convert_project_images_to_proxy(
                            template_data["candidate"]["projects"]
                        )
                    
                    # 4. Charger le template HTML
                    # Essayer plusieurs chemins possibles (dans l'ordre de priorité)
                    possible_template_paths = [
                        "/app/frontend/src/portfolio html/portfolio_template.html",  # Copié dans le conteneur (priorité)
                        "/frontend/src/portfolio html/portfolio_template.html",  # Volume monté Docker
                        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "src", "portfolio html", "portfolio_template.html"),  # Depuis racine projet
                    ]
                    
                    template_path = None
                    css_path = None
                    
                    for tp in possible_template_paths:
                        if os.path.exists(tp):
                            template_path = tp
                            # Construire le chemin CSS correspondant
                            css_path = tp.replace("portfolio_template.html", "index.css")
                            if not os.path.exists(css_path):
                                # Essayer d'autres variantes pour le CSS
                                css_dir = os.path.dirname(tp)
                                css_path = os.path.join(css_dir, "index.css")
                            break
                    
                    if not template_path or not os.path.exists(template_path):
                        print(f"⚠️  [PDF Thread] Template HTML introuvable après avoir essayé:")
                        for tp in possible_template_paths:
                            exists = "✅" if os.path.exists(tp) else "❌"
                            print(f"  {exists} {tp}")
                        print(f"🔍 [PDF Thread] Répertoire courant: {os.getcwd()}")
                        print(f"🔍 [PDF Thread] __file__: {__file__}")
                        print(f"🔍 [PDF Thread] /frontend existe: {os.path.exists('/frontend')}")
                        if os.path.exists('/frontend'):
                            try:
                                print(f"🔍 [PDF Thread] Contenu de /frontend: {os.listdir('/frontend')}")
                            except Exception as e:
                                print(f"🔍 [PDF Thread] Erreur listdir /frontend: {e}")
                        if os.path.exists('/app'):
                            try:
                                print(f"🔍 [PDF Thread] Contenu de /app: {os.listdir('/app')[:10]}")
                            except Exception as e:
                                print(f"🔍 [PDF Thread] Erreur listdir /app: {e}")
                        return
                    
                    print(f"✅ [PDF Thread] Template trouvé: {template_path}")
                    
                    # 5. Lire et rendre le template
                    with open(template_path, 'r', encoding='utf-8') as f:
                        template_content = f.read()
                    
                    jinja_template = Template(template_content)
                    html_content = jinja_template.render(
                        candidate=template_data.get('candidate', {}),
                        portfolio=template_data.get('portfolio', {}),
                        db_candidate_id=db_candidate_id,
                        candidate_uuid=candidate_uuid
                    )
                    
                    # 6. Injecter le CSS
                    if os.path.exists(css_path):
                        with open(css_path, 'r', encoding='utf-8') as f:
                            css_content = f.read()
                        html_content = html_content.replace(
                            '<link rel="stylesheet" href="/portfolio/static/index.css">',
                            f'<style>\n{css_content}\n</style>'
                        )
                    
                    # 7. Injecter les données JavaScript (comme dans /view)
                    candidate = template_data.get("candidate", {})
                    first_name = candidate.get("first_name", "")
                    last_name = candidate.get("last_name", "")
                    title_text = f"Portfolio - {first_name} {last_name}".strip()
                    if not title_text or title_text == "Portfolio -":
                        title_text = "Portfolio"
                    
                    data_injection_script = f"""
<script>
    window.portfolioData = {json.dumps(template_data, ensure_ascii=False)};
    window.dbCandidateId = {db_candidate_id};
    window.candidateUuid = "{candidate_uuid}";
    if (typeof populateTemplate === 'function') {{
        populateTemplate();
    }}
</script>
"""
                    html_content = html_content.replace('</body>', f'{data_injection_script}\n</body>')
                    html_content = re.sub(r'<title>.*?</title>', f'<title>{title_text}</title>', html_content, flags=re.DOTALL)
                    
                    # 7b. Sauvegarder le HTML dans MinIO (version long)
                    try:
                        from B2.generate_portfolio_html import save_portfolio_html
                        save_ok, html_url, save_err = save_portfolio_html(
                            html_content,
                            db_candidate_id,
                            candidate_uuid,
                            version="long",
                            lang=lang
                        )
                        if save_ok:
                            print(f"✅ [PDF Thread] HTML long sauvegardé dans MinIO: {html_url}")
                        else:
                            print(f"⚠️  [PDF Thread] Échec sauvegarde HTML MinIO: {save_err}")
                    except Exception as e:
                        print(f"⚠️  [PDF Thread] Exception sauvegarde HTML: {e}")
                    
                    # 8. Convertir le HTML en PDF
                    print(f"🔄 [PDF Thread] Appel de convert_html_to_pdf...")
                    pdf_success, pdf_url, pdf_error = convert_html_to_pdf(
                        html_content,
                        db_candidate_id,
                        candidate_uuid
                    )
                    
                    if pdf_success:
                        print(f"✅ [PDF Thread] PDF généré avec succès: {pdf_url}")
                        # Sauvegarder l'URL du PDF dans Supabase (colonne portfolio_pdf_minio_url)
                        try:
                            if supabase_db is not None:
                                supabase_db.table("candidates").update(
                                    {"portfolio_pdf_minio_url": pdf_url}
                                ).eq("id", db_candidate_id).execute()
                                print("✅ URL PDF sauvegardée dans Supabase (candidates.portfolio_pdf_minio_url)")
                        except Exception as e:
                            print(f"⚠️  Erreur sauvegarde URL PDF dans Supabase: {e}")
                    else:
                        print(f"❌ [PDF Thread] Erreur génération PDF: {pdf_error}")
                        
                except Exception as e:
                    print(f"❌ [PDF Thread] Erreur lors de la génération PDF en arrière-plan: {e}")
                    import traceback
                    traceback.print_exc()
                    print(f"❌ [PDF Thread] Stack trace complet:")
                    traceback.print_exc()
            
            # Démarrer la génération du PDF en arrière-plan
            pdf_thread = threading.Thread(target=generate_pdf_background, daemon=True)
            pdf_thread.start()
            print(f"🔄 Génération PDF démarrée en arrière-plan (thread ID: {pdf_thread.ident})")
        except Exception as e:
            print(f"❌ Erreur lors du démarrage de la génération PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération du portfolio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/portfolio/<candidate_uuid>/regenerate", methods=["POST"])
def regenerate_portfolio(candidate_uuid):
    """
    Régénère le portfolio avec des modifications demandées par le candidat.
    
    Body (JSON):
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
        modifications: str (obligatoire) - Modifications demandées par le candidat
    
    Returns:
        JSON avec le nouveau contenu du portfolio
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        modifications = data.get("modifications", "").strip()
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        if not modifications:
            return jsonify({"error": "Les modifications sont requises"}), 400
        
        # Supprimer les anciennes versions du portfolio depuis le stockage avant régénération
        try:
            storage = get_supabase_storage()
            prefix = get_candidate_minio_prefix(db_candidate_id) + f"portfolio_{candidate_uuid}"
            objects_to_remove = [
                f"{prefix}.pdf",
                f"{prefix}_one-page.pdf",
                f"{prefix}.html",
                f"{prefix}_one-page.html",
            ]
            if storage and storage.client:
                for object_name in objects_to_remove:
                    del_ok, _ = storage.delete_file(object_name)
                    if del_ok:
                        print(f"🗑️ Ancien portfolio supprimé du stockage: {object_name}")
        except Exception as e:
            print(f"⚠️ Suppression des anciens portfolios (stockage) (non bloquant): {e}")
        
        from B2.agent_portfolio import generate_portfolio_content_with_feedback
        
        print(f"🔄 Régénération du portfolio pour candidate_uuid={candidate_uuid}")
        print(f"📝 Modifications demandées: {modifications}")
        
        # Régénérer le contenu du portfolio avec les modifications
        success, portfolio_data, error = generate_portfolio_content_with_feedback(
            db_candidate_id,
            feedback_modifications=modifications,
            output_json_path=None
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de la régénération du portfolio"
            }), 500
        
        # Récupérer l'URL de l'image du candidat
        candidate_image_url = _get_candidate_image_url(db_candidate_id)
        
        # Préparer la réponse
        response_data = {
            "success": True,
            "candidate_uuid": candidate_uuid,
            "db_candidate_id": db_candidate_id,
            "portfolio_content": portfolio_data,
            "candidate_image_url": candidate_image_url,
            "json_path": None,
            "modifications_applied": modifications
        }
        
        # Upload du JSON vers le stockage (directement depuis l'objet Python)
        try:
            import time
            timestamp = int(time.time())
            object_name = f"{get_candidate_minio_prefix(db_candidate_id)}portfolio_{candidate_uuid}_v{timestamp}.json"
            json_bytes = json.dumps(portfolio_data, ensure_ascii=False, indent=2).encode("utf-8")
            success, url, _ = _upload_to_minio_with_logging(
                None,
                json_bytes,
                object_name,
                content_type="application/json"
            )
            if success:
                response_data["json_minio_url"] = url
        except Exception as e:
            print(f"⚠️  Erreur upload JSON vers le stockage: {e}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Erreur lors de la régénération du portfolio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/portfolio/<candidate_uuid>/template-data", methods=["POST"])
def get_portfolio_template_data(candidate_uuid):
    """
    Retourne les données du portfolio transformées pour le template (format JSON).
    Le frontend utilisera ces données pour remplacer les placeholders dans le template HTML.
    
    Body (JSON):
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
    
    Returns:
        JSON avec les données transformées pour le template
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        from B2.agent_portfolio import generate_portfolio_content, transform_portfolio_data_for_template
        
        print(f"🔄 Génération données template pour candidate_uuid={candidate_uuid}, db_candidate_id={db_candidate_id}")
        
        # 1. Générer le contenu du portfolio (JSON brut) — portfolio long = CV original
        success, portfolio_data, error = generate_portfolio_content(
            db_candidate_id,
            output_json_path=None,
            use_original_cv=True
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de la génération du portfolio"
            }), 500
        
        # 2. Récupérer les données du candidat depuis la base de données
        candidate_data = _get_candidate_info(
            db_candidate_id, 
            ['image_minio_url', 'titre_profil', 'annees_experience', 'email', 'phone']
        )
        # Convertir l'URL MinIO en URL proxy
        minio_image_url = candidate_data.get("image_minio_url")
        candidate_image_url = _convert_minio_url_to_proxy(minio_image_url)
        candidate_job_title = candidate_data.get("titre_profil")
        candidate_years_experience = candidate_data.get("annees_experience")
        candidate_email = candidate_data.get("email")
        candidate_phone = candidate_data.get("phone")
        
        # 3. Transformer les données pour le template
        template_data = transform_portfolio_data_for_template(
            portfolio_data,
            candidate_image_url=candidate_image_url,
            candidate_job_title=candidate_job_title,
            candidate_years_experience=candidate_years_experience,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone
        )
        
        # 4. Retourner les données transformées
        return jsonify({
            "success": True,
            "template_data": template_data
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération des données template: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/portfolio/<candidate_uuid>/view", methods=["GET"])
def view_portfolio_html(candidate_uuid):
    """
    Retourne la page HTML du portfolio avec les données injectées.
    L'utilisateur sera redirigé vers cette page après la génération du portfolio.
    
    Query params:
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
    
    Returns:
        HTML page with portfolio data injected
    """
    try:
        db_candidate_id = request.args.get("db_candidate_id", type=int)
        
        if not db_candidate_id:
            return "<h1>Erreur</h1><p>db_candidate_id est requis</p>", 400
        
        from B2.agent_portfolio import generate_portfolio_content, transform_portfolio_data_for_template
        
        print(f"🔄 Génération page HTML portfolio pour candidate_uuid={candidate_uuid}, db_candidate_id={db_candidate_id}")
        
        # 1. Générer le contenu du portfolio (JSON brut) — portfolio long = CV original
        success, portfolio_data, error = generate_portfolio_content(
            db_candidate_id,
            output_json_path=None,
            use_original_cv=True
        )
        
        if not success:
            return f"<h1>Erreur</h1><p>{error or 'Erreur lors de la génération du portfolio'}</p>", 500
        
        # 2. Récupérer les données du candidat depuis la base de données
        candidate_data = _get_candidate_info(
            db_candidate_id,
            ['image_minio_url', 'email', 'phone', 'titre_profil', 'disponibilite', 'linkedin', 'github', 'behance']
        )
        # Convertir l'URL MinIO en URL proxy
        minio_image_url = candidate_data.get("image_minio_url")
        candidate_image_url = _convert_minio_url_to_proxy(minio_image_url)
        candidate_email = candidate_data.get("email")
        candidate_phone = candidate_data.get("phone")
        
        # 3. Transformer les données pour le template
        template_data = transform_portfolio_data_for_template(
            portfolio_data,
            candidate_image_url=candidate_image_url,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
            candidate_job_title=candidate_data.get("titre_profil")
        )
        
        # 3.1 Convertir les URLs MinIO des images de projets en URLs proxy
        if template_data.get("candidate") and template_data["candidate"].get("projects"):
            print(f"🔄 Conversion des URLs d'images pour {len(template_data['candidate']['projects'])} projets...")
            template_data["candidate"]["projects"] = _convert_project_images_to_proxy(
                template_data["candidate"]["projects"]
            )
        
        # 3.2 LinkedIn / GitHub / Behance : priorité à la base de données
        if template_data.get("candidate"):
            for db_key, template_key in [("linkedin", "linkedin_url"), ("github", "github_url"), ("behance", "behance_url")]:
                db_val = (candidate_data.get(db_key) or "").strip()
                if db_val:
                    template_data["candidate"][template_key] = db_val
            # 3.3 Poste cible : titre, type de contrat, disponibilité (choix du candidat au début)
            if (candidate_data.get("titre_profil") or "").strip():
                template_data["candidate"]["job_title"] = (candidate_data.get("titre_profil") or "").strip()
            if (candidate_data.get("disponibilite") or "").strip():
                template_data["candidate"]["availability"] = (candidate_data.get("disponibilite") or "").strip()
                template_data["candidate"]["disponibilite"] = template_data["candidate"]["availability"]
            contract_types = _get_candidate_contract_types(db_candidate_id)
            if contract_types:
                template_data["candidate"]["contract_type"] = ", ".join(contract_types)
                template_data["candidate"]["type_contrat"] = contract_types
            # Scores A2 : score global + justification (5 dimensions technique/comportemental), pas les soft skills déclarés
            try:
                from B2.generate_portfolio_html import _inject_scoring_into_candidate
                _inject_scoring_into_candidate(template_data["candidate"], db_candidate_id)
            except Exception as inj_err:
                print(f"⚠️ Injection scores A2 (vue portfolio long): {inj_err}")
        
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_path = os.path.join(project_root, "frontend", "src", "20260312_044613", "portfolio_long_template.html")
        css_path = os.path.join(project_root, "frontend", "src", "portfolio html", "index.css")
        
        if not os.path.exists(template_path):
            return f"<h1>Erreur</h1><p>Template HTML introuvable: {template_path}</p>", 500
        
        # Lire le template
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # URL de base pour les assets (icônes SVG, images) — avec domaine/public, utiliser RECRUIT_BASE_URL
        base_url = (os.getenv("RECRUIT_BASE_URL") or (request.url_root.rstrip("/") if request else None) or "http://localhost:5002").rstrip("/")
        if not base_url.startswith("http"):
            base_url = f"http://{base_url}"
        assets_base_url = base_url + "/portfolio/static/"
        
        # Rendre le template avec Jinja2
        print(f"🔄 Rendu du template avec Jinja2...")
        try:
            jinja_template = Template(template_content)
            html_content = jinja_template.render(
                candidate=template_data.get('candidate', {}),
                portfolio=template_data.get('portfolio', {}),
                db_candidate_id=db_candidate_id,
                candidate_uuid=candidate_uuid,
                assets_base_url=assets_base_url,
                portfolio_lang=request.args.get("lang", "fr")
            )
            print(f"✅ Template rendu avec succès avec Jinja2")
        except Exception as e:
            print(f"❌ Erreur lors du rendu Jinja2: {e}")
            import traceback
            traceback.print_exc()
            return f"<h1>Erreur</h1><p>Erreur lors du rendu du template: {str(e)}</p>", 500
        
        # Lire le CSS et l'injecter directement dans le HTML
        if os.path.exists(css_path):
            with open(css_path, 'r', encoding='utf-8') as f:
                css_content = f.read()
            # Remplacer la balise <link> par une balise <style> avec le CSS
            html_content = html_content.replace(
                '<link rel="stylesheet" href="/portfolio/static/index.css">',
                f'<style>\n{css_content}\n</style>'
            )
        else:
            print(f"⚠️  Fichier CSS introuvable: {css_path}")
        
        # 5. Injecter les données dans le HTML
        # On ajoute un script qui injecte les données et appelle populateTemplate
        # Debug: Vérifier que les projets sont présents dans template_data
        projects_count = len(template_data.get("candidate", {}).get("projects", []))
        print(f"🔍 [View Portfolio] Nombre de projets dans template_data: {projects_count}")
        if projects_count > 0:
            print(f"🔍 [View Portfolio] Premier projet: {template_data['candidate']['projects'][0].get('title', 'N/A')}")
        else:
            print(f"⚠️  [View Portfolio] AUCUN PROJET dans template_data!")
            print(f"🔍 [View Portfolio] Structure de template_data: {list(template_data.keys())}")
            if "candidate" in template_data:
                print(f"🔍 [View Portfolio] Clés de candidate: {list(template_data['candidate'].keys())}")
        
        # Préparer le titre pour le JavaScript aussi
        candidate = template_data.get("candidate", {})
        first_name = candidate.get("first_name", "")
        last_name = candidate.get("last_name", "")
        title_text = f"Portfolio - {first_name} {last_name}".strip()
        if not title_text or title_text == "Portfolio -":
            title_text = "Portfolio"
        
        data_injection_script = f"""
<script>
    // Données du portfolio injectées par le backend
    const portfolioData = {json.dumps(template_data, ensure_ascii=False, indent=2)};
    
    // Mettre à jour le titre de la page immédiatement
    document.title = {json.dumps(title_text)};
    
    // Debug immédiat pour vérifier les projets
    console.log('🔍 [Backend Injection] Vérification des projets:', {{
        hasCandidate: !!portfolioData.candidate,
        hasProjects: !!portfolioData.candidate?.projects,
        projectsType: typeof portfolioData.candidate?.projects,
        projectsIsArray: Array.isArray(portfolioData.candidate?.projects),
        projectsLength: portfolioData.candidate?.projects?.length || 0,
        projectsPreview: portfolioData.candidate?.projects?.slice(0, 2) || 'N/A'
    }});
    
    // Attendre que le DOM soit chargé
    document.addEventListener('DOMContentLoaded', function() {{
        console.log('🔄 Injection des données du portfolio...');
        console.log('📦 Données injectées:', portfolioData);
        
        // S'assurer que le titre est à jour
        document.title = {json.dumps(title_text)};
        
        // Appeler la fonction populateTemplate qui existe déjà dans le template
        if (typeof populateTemplate === 'function') {{
            populateTemplate(portfolioData);
        }} else {{
            console.error('❌ Fonction populateTemplate non trouvée');
        }}
    }});
</script>
"""
        
        candidate = template_data.get("candidate", {})
        first_name = candidate.get("first_name", "")
        last_name = candidate.get("last_name", "")
        title_text = f"Portfolio - {first_name} {last_name}".strip()
        if not title_text or title_text == "Portfolio -":
            title_text = "Portfolio"
        title_pattern = r'<title>.*?</title>'
        html_content = re.sub(title_pattern, f'<title>{title_text}</title>', html_content, flags=re.DOTALL)
        
        # Injecter le script juste avant la fermeture du body
        html_content = html_content.replace('</body>', f'{data_injection_script}\n</body>')
        
        print(f"✅ Page HTML portfolio générée avec succès")
        
        # 6. Convertir automatiquement en PDF en arrière-plan
        try:
            from B2.agent_portfolio import convert_html_to_pdf
            import threading
            
            def generate_pdf_background():
                """Génère le PDF en arrière-plan"""
                try:
                    print(f"🔄 Démarrage génération PDF en arrière-plan pour candidate_id={db_candidate_id}")
                    success, pdf_url, error = convert_html_to_pdf(
                        html_content,
                        db_candidate_id,
                        candidate_uuid
                    )
                    if success:
                        print(f"✅ PDF généré avec succès: {pdf_url}")
                        # Nouveau schéma : on ne persiste plus l'URL PDF dans la table candidates
                        # (les URLs des fichiers sont gérées via le stockage MinIO / Supabase Storage).
                    else:
                        print(f"❌ Erreur génération PDF: {error}")
                except Exception as e:
                    print(f"❌ Erreur dans le thread de génération PDF: {e}")
            
            # Lancer la génération PDF en arrière-plan
            pdf_thread = threading.Thread(target=generate_pdf_background, daemon=True)
            pdf_thread.start()
            print(f"🔄 Thread de génération PDF lancé en arrière-plan")
            
        except Exception as e:
            print(f"⚠️  Erreur lors du démarrage de la génération PDF: {e}")
            # Continuer même si la génération PDF échoue
        
        return html_content, 200, {'Content-Type': 'text/html; charset=utf-8'}
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération de la page HTML: {e}")
        import traceback
        traceback.print_exc()
        return f"<h1>Erreur</h1><p>{str(e)}</p>", 500


@app.route("/portfolio/<candidate_uuid>/saved-html/<version>", methods=["GET"])
def get_portfolio_saved_html(candidate_uuid, version):
    """
    Retourne le portfolio HTML déjà sauvegardé dans le stockage (Supabase) (sans régénération).
    Query params: db_candidate_id (obligatoire), lang (optionnel, "fr" ou "en"), redirect (optionnel, "1" = redirection vers l'URL de stockage directe).
    Version: "one-page" ou "long".
    Retourne 404 si le fichier n'existe pas dans MinIO.
    """
    try:
        db_candidate_id = request.args.get("db_candidate_id", type=int)
        lang = (request.args.get("lang") or "fr").strip().lower()
        if lang not in ("fr", "en"):
            lang = "fr"
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        if version not in ["one-page", "long"]:
            return jsonify({"error": f"Version invalide: {version}"}), 400

        storage = get_supabase_storage()
        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
        object_name_with_lang = f"{minio_prefix}portfolio_{candidate_uuid}_{version}_{lang}.html"
        # Variante autre langue (ex: on demande en → essayer fr)
        alt_lang = "fr" if lang == "en" else "en"
        object_name_alt_lang = f"{minio_prefix}portfolio_{candidate_uuid}_{version}_{alt_lang}.html"
        object_name_fallback = f"{minio_prefix}portfolio_{candidate_uuid}_{version}.html"

        # Redirection vers l'URL signée/public de stockage (utilisable par le navigateur)
        if request.args.get("redirect") == "1":
            if not storage or not storage.client:
                return jsonify({"error": "Stockage non disponible"}), 503
            try:
                url = (
                    storage.get_file_url(object_name_with_lang)
                    or storage.get_file_url(object_name_alt_lang)
                    or storage.get_file_url(object_name_fallback)
                )
            except Exception as e:
                print(f"❌ Erreur génération URL de stockage pour portfolio HTML: {e}")
                url = None
            if not url:
                return jsonify({"error": "Fichier introuvable dans le stockage"}), 404
            return redirect(url, code=302)

        if not storage or not storage.client:
            return jsonify({"error": "Stockage non disponible"}), 503

        success, file_bytes, error = storage.download_file(object_name_with_lang)
        if not success or not file_bytes:
            # Essayer la version dans l'autre langue (ex: fr) si elle existe
            success, file_bytes, error = storage.download_file(object_name_alt_lang)
        if not success or not file_bytes:
            # Dernier recours : fichier sans suffixe de langue
            success, file_bytes, error = storage.download_file(object_name_fallback)
        if not success or not file_bytes:
            return jsonify({"error": "Version demandée non sauvegardée dans le stockage", "detail": error or "Fichier introuvable"}), 404

        html_content = file_bytes.decode("utf-8")
        # Injecter le favicon TAP pour que l'onglet affiche l'icône TAP
        favicon_tag = '<link rel="icon" type="image/svg+xml" href="/TapIcon.svg">'
        if "</head>" in html_content and "TapIcon.svg" not in html_content:
            html_content = html_content.replace("</head>", f"{favicon_tag}\n</head>", 1)
        return html_content, 200, {"Content-Type": "text/html; charset=utf-8"}
    except Exception as e:
        print(f"❌ Erreur récupération HTML sauvegardé: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/portfolio/<candidate_uuid>/html/<version>", methods=["GET"])
def get_portfolio_html(candidate_uuid, version):
    """
    Génère et retourne le portfolio HTML dans la version demandée.
    
    Query params:
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
    
    Path params:
        version: "one-page" ou "long" - Version du portfolio à générer
    
    Returns:
        HTML content ou erreur JSON
    """
    try:
        db_candidate_id = request.args.get("db_candidate_id", type=int)
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        if version not in ["one-page", "long"]:
            return jsonify({"error": f"Version invalide: {version}. Utilisez 'one-page' ou 'long'"}), 400
        
        from B2.generate_portfolio_html import generate_portfolio_html
        
        # Récupérer les données du candidat depuis la base de données
        candidate_data = _get_candidate_info(
            db_candidate_id,
            ['image_minio_url', 'email', 'phone', 'titre_profil', 'annees_experience', 'linkedin', 'github']
        )
        
        # Convertir l'URL MinIO en URL proxy
        minio_image_url = candidate_data.get("image_minio_url")
        candidate_image_url = _convert_minio_url_to_proxy(minio_image_url) if minio_image_url else None
        candidate_email = candidate_data.get("email")
        candidate_phone = candidate_data.get("phone")
        candidate_job_title = candidate_data.get("titre_profil")
        candidate_years_experience = candidate_data.get("annees_experience")
        candidate_linkedin_url = (candidate_data.get("linkedin") or "").strip() or None
        candidate_github_url = (candidate_data.get("github") or "").strip() or None
        
        print(f"🔄 Génération portfolio HTML (version: {version}) pour candidate_uuid={candidate_uuid}, db_candidate_id={db_candidate_id}")
        
        # Obtenir l'URL de base Flask pour les proxies (RECRUIT_BASE_URL pour domaine ex: https://demo.tap-hr.com/api)
        flask_base_url = (os.getenv("RECRUIT_BASE_URL") or request.host_url or "http://localhost:5002").rstrip('/')
        if not flask_base_url.startswith('http'):
            flask_base_url = f"http://{flask_base_url}"
        
        # Langue : query param ?lang=en ou ?lang=fr (défaut fr)
        lang_param = (request.args.get("lang") or "fr").strip().lower()
        if lang_param not in ("fr", "en"):
            lang_param = "fr"

        # Générer le HTML
        success, html_content, error = generate_portfolio_html(
            candidate_id=db_candidate_id,
            version=version,
            candidate_image_url=candidate_image_url,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
            candidate_job_title=candidate_job_title,
            candidate_years_experience=candidate_years_experience,
            flask_base_url=flask_base_url,
            candidate_uuid=candidate_uuid,
            candidate_linkedin_url=candidate_linkedin_url,
            candidate_github_url=candidate_github_url,
            lang=lang_param
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de la génération du portfolio HTML"
            }), 500
        
        # Convertir les URLs MinIO des images de projets en URLs proxy
        # (le HTML généré contient déjà les URLs, mais on peut les post-traiter si nécessaire)
        
        # Générer le PDF en arrière-plan pour la version one-page aussi
        try:
            from B2.agent_portfolio import convert_html_to_pdf
            import threading
            
            def generate_pdf_background():
                """Génère le PDF en arrière-plan pour la version one-page"""
                try:
                    print(f"🔄 [PDF Thread One-Page] Démarrage génération PDF en arrière-plan pour candidate_id={db_candidate_id}")
                    # Utiliser le HTML déjà généré, même taille de page 1920×1080 pour contenu complet
                    pdf_success, pdf_url, pdf_error = convert_html_to_pdf(
                        html_content,
                        db_candidate_id,
                        candidate_uuid,
                        pdf_page_format="one-page"
                    )
                    
                    if pdf_success:
                        with _portfolio_pdf_lock:
                            _portfolio_pdf_generated_at[(db_candidate_id, "one-page")] = _time.time()
                        print(f"✅ [PDF Thread One-Page] PDF généré avec succès: {pdf_url}")
                        # Sauvegarder l'URL du PDF dans la base de données si la colonne existe
                        try:
                            from database.connection import DatabaseConnection
                            DatabaseConnection.initialize()
                            with DatabaseConnection.get_connection() as db:
                                cursor = db.cursor()
                                cursor.execute("""
                                    SELECT COLUMN_NAME 
                                    FROM INFORMATION_SCHEMA.COLUMNS 
                                    WHERE TABLE_SCHEMA = DATABASE() 
                                    AND TABLE_NAME = 'candidates' 
                                    AND COLUMN_NAME = 'portfolio_pdf_minio_url'
                                """)
                                if cursor.fetchone():
                                    cursor.execute(
                                        "UPDATE candidates SET portfolio_pdf_minio_url = %s WHERE id = %s",
                                        (pdf_url, db_candidate_id)
                                    )
                                    db.commit()
                                    print(f"✅ URL PDF sauvegardée en base de données")
                                cursor.close()
                        except Exception as e:
                            print(f"⚠️  Erreur sauvegarde URL PDF en base: {e}")
                    else:
                        print(f"❌ [PDF Thread One-Page] Erreur génération PDF: {pdf_error}")
                except Exception as e:
                    print(f"❌ [PDF Thread One-Page] Erreur lors de la génération PDF: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Démarrer la génération du PDF en arrière-plan
            pdf_thread = threading.Thread(target=generate_pdf_background, daemon=True)
            pdf_thread.start()
            print(f"🔄 Génération PDF one-page démarrée en arrière-plan")
        except Exception as e:
            print(f"⚠️  Erreur lors du démarrage de la génération PDF one-page: {e}")
            # Ne pas bloquer la réponse HTML même si le PDF échoue
        
        return html_content, 200, {'Content-Type': 'text/html; charset=utf-8'}
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération du portfolio HTML: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/portfolio/<candidate_uuid>/generate-html", methods=["POST"])
def generate_portfolio_html_endpoint(candidate_uuid):
    """
    Génère et sauvegarde le portfolio HTML dans le stockage (Supabase Storage).
    
    Body (JSON):
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
        version: str (optionnel, défaut: "one-page") - Version du portfolio ("one-page" ou "long")
        save_to_minio: bool (optionnel, défaut: true) - Si True, sauvegarde dans le stockage
    
    Returns:
        JSON avec le HTML généré et l'URL de stockage si sauvegardé
    """
    try:
        data = request.get_json() or {}
        db_candidate_id = data.get("db_candidate_id")
        version = data.get("version", "one-page")
        save_to_minio = data.get("save_to_minio", True)
        lang_raw = data.get("lang")
        lang_explicit = isinstance(lang_raw, str) and bool(lang_raw.strip())
        lang = (lang_raw or "fr").strip().lower()
        if lang not in ("fr", "en"):
            lang = "fr"
        # Par défaut:
        # - si la langue n'est pas explicite, générer aussi l'autre langue (comportement historique)
        # - si la langue est explicite, ne pas relancer automatiquement l'autre langue
        auto_generate_other_lang = data.get("auto_generate_other_lang")
        if auto_generate_other_lang is None:
            auto_generate_other_lang = not lang_explicit
        else:
            auto_generate_other_lang = bool(auto_generate_other_lang)
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        if version not in ["one-page", "long"]:
            return jsonify({"error": f"Version invalide: {version}. Utilisez 'one-page' ou 'long'"}), 400
        
        from B2.generate_portfolio_html import generate_and_save_portfolio_html
        
        # Récupérer les données du candidat depuis la base de données
        candidate_data = _get_candidate_info(
            db_candidate_id,
            ['image_minio_url', 'email', 'phone', 'titre_profil', 'annees_experience', 'disponibilite', 'linkedin', 'github', 'behance']
        )
        
        # Convertir l'URL d'image de stockage (héritée de l'ancien champ MinIO) en URL proxy
        minio_image_url = candidate_data.get("image_minio_url")
        candidate_image_url = _convert_minio_url_to_proxy(minio_image_url) if minio_image_url else None
        candidate_email = candidate_data.get("email")
        candidate_phone = candidate_data.get("phone")
        candidate_job_title = candidate_data.get("titre_profil")
        candidate_years_experience = candidate_data.get("annees_experience")
        candidate_availability = (candidate_data.get("disponibilite") or "").strip() or None
        candidate_contract_type = ", ".join(_get_candidate_contract_types(db_candidate_id)) or None
        candidate_linkedin_url = (candidate_data.get("linkedin") or "").strip() or None
        candidate_github_url = (candidate_data.get("github") or "").strip() or None
        candidate_behance_url = (candidate_data.get("behance") or "").strip() or None
        
        print(f"🔄 Génération et sauvegarde portfolio HTML (version: {version}) pour candidate_uuid={candidate_uuid}, db_candidate_id={db_candidate_id}")
        
        # Pour la version "long", utiliser le même template que la vue (évite d'enregistrer l'ancien template dans MinIO)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        long_template_path = os.path.join(project_root, "frontend", "src", "20260312_044613", "portfolio_long_template.html") if version == "long" else None
        
        # Obtenir l'URL de base Flask pour les proxies (RECRUIT_BASE_URL pour domaine ex: https://demo.tap-hr.com/api)
        flask_base_url = (os.getenv("RECRUIT_BASE_URL") or request.host_url or "http://localhost:5002").rstrip('/')
        if not flask_base_url.startswith('http'):
            flask_base_url = f"http://{flask_base_url}"
        
        from B2.generate_portfolio_html import generate_portfolio_html, save_portfolio_html
        
        # Générer le HTML (avec langue pour contenu + libellés)
        success, html_content, error = generate_portfolio_html(
            candidate_id=db_candidate_id,
            version=version,
            candidate_image_url=candidate_image_url,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
            candidate_job_title=candidate_job_title,
            candidate_years_experience=candidate_years_experience,
            candidate_availability=candidate_availability,
            candidate_contract_type=candidate_contract_type,
            flask_base_url=flask_base_url,
            candidate_uuid=candidate_uuid,
            candidate_linkedin_url=candidate_linkedin_url,
            candidate_github_url=candidate_github_url,
            candidate_behance_url=candidate_behance_url,
            long_template_path=long_template_path,
            lang=lang
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": error or "Erreur lors de la génération du portfolio HTML"
            }), 500
        
        # Sauvegarder le HTML dans le stockage si demandé (one-page et long)
        minio_url = None
        html_minio_url = None
        if save_to_minio:
            save_success, html_minio_url, save_error = save_portfolio_html(
                html_content,
                db_candidate_id,
                candidate_uuid,
                version,
                lang=lang
            )
            minio_url = html_minio_url
            if save_success:
                print(f"✅ Portfolio HTML ({version}, {lang}) sauvegardé dans le stockage: {html_minio_url}")
            else:
                print(f"⚠️  Erreur sauvegarde HTML dans le stockage ({version}): {save_error}")
        
        # Helper pour sauvegarder l'URL du PDF portfolio (long ou one-page) dans fichiers_versions
        def _save_portfolio_pdf_url(pdf_url_to_save: str, version_to_save: str):
            if not pdf_url_to_save:
                return
            try:
                if supabase_db is None:
                    print("⚠️  Supabase DB non configurée, impossible de sauvegarder l'URL du PDF de portfolio.")
                    return

                def _extract_storage_path_for_portfolio(url: str | None) -> str | None:
                    if not url:
                        return None
                    try:
                        # Si on reçoit déjà un chemin logique (sans schéma), le renvoyer tel quel
                        if "://" not in url and not url.startswith("http"):
                            return url

                        # Ancien schéma: URL HTTP complète contenant le bucket
                        marker = "/tap-files/"
                        if marker in url:
                            return url.split(marker, 1)[1]

                        # Fallback: dernier segment
                        return url.split("/")[-1]
                    except Exception:
                        return None

                storage_path = _extract_storage_path_for_portfolio(pdf_url_to_save)
                col_name = "one_page_pdf_url" if version_to_save == "one-page" else "long_pdf_url"
                update_data = {col_name: (storage_path or "")[:500]}

                # Update the existing row by candidate_id alone (row was already created
                # during CV correction with the real candidate_uuid — using upsert on
                # (candidate_id, candidate_uuid) would insert a duplicate if the UUID in
                # the request differs from the one stored).
                result = supabase_db.table("fichiers_versions").update(
                    update_data
                ).eq("candidate_id", db_candidate_id).execute()

                # Fallback: if no row existed yet, insert one
                if not result.data:
                    update_data["candidate_id"] = db_candidate_id
                    update_data["candidate_uuid"] = candidate_uuid
                    supabase_db.table("fichiers_versions").upsert(
                        update_data,
                        on_conflict="candidate_id,candidate_uuid",
                    ).execute()
                print(
                    f"✅ {version_to_save} portfolio PDF URL synchronisé dans Supabase "
                    f"pour candidate_id={db_candidate_id}, candidate_uuid={candidate_uuid}"
                )
            except Exception as e:
                print(f"⚠️  Erreur sauvegarde {version_to_save} portfolio PDF URL dans Supabase: {e}")

        # Lancer la génération du PDF en arrière-plan (pour que GET /pdf trouve le fichier après quelques secondes)
        try:
            import threading
            from B2.agent_portfolio import convert_html_to_pdf

            def _generate_pdf_background():
                try:
                    print(f"🔄 [PDF] Génération PDF en arrière-plan (version={version}, lang={lang})...")
                    pdf_page_format = "one-page" if version == "one-page" else None
                    pdf_success, pdf_url, pdf_error = convert_html_to_pdf(
                        html_content,
                        db_candidate_id,
                        candidate_uuid,
                        base_url=flask_base_url,
                        pdf_page_format=pdf_page_format,
                        lang=lang
                    )
                    if pdf_success:
                        with _portfolio_pdf_lock:
                            _portfolio_pdf_generated_at[(db_candidate_id, version, lang)] = _time.time()
                            _portfolio_pdf_generated_at[(db_candidate_id, version)] = _time.time()  # rétrocompat
                        print(f"✅ [PDF] PDF généré et uploadé: {pdf_url}")
                        # Sauvegarder l'URL du PDF dans fichiers_versions
                        _save_portfolio_pdf_url(pdf_url, version)
                    else:
                        print(f"❌ [PDF] Erreur: {pdf_error}")
                except Exception as e:
                    print(f"❌ [PDF] Exception: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    with _portfolio_pdf_lock:
                        _portfolio_pdf_jobs_in_progress.discard((db_candidate_id, version, lang))

            with _portfolio_pdf_lock:
                _pdf_job_key = (db_candidate_id, version, lang)
                _pdf_already_running = _pdf_job_key in _portfolio_pdf_jobs_in_progress
                if not _pdf_already_running:
                    _portfolio_pdf_jobs_in_progress.add(_pdf_job_key)
            if _pdf_already_running:
                print(f"ℹ️ [PDF] Génération déjà en cours, thread non relancé (version={version}, lang={lang})")
            else:
                threading.Thread(target=_generate_pdf_background, daemon=True).start()
                print(f"🔄 [PDF] Thread de génération PDF lancé (version={version}, lang={lang})")
        except Exception as e:
            print(f"⚠️ [PDF] Démarrage thread PDF échoué: {e}")

        # Générer et enregistrer l'autre langue (FR/EN) en arrière-plan pour one-page et long
        _other_lang = "en" if lang == "fr" else "fr"
        def _generate_other_lang_background():
            import time as _time2
            try:
                print(f"🔄 [PDF] Génération de l'autre langue ({_other_lang}, version={version}) en arrière-plan...")
                success_other, html_other, error_other = generate_portfolio_html(
                    candidate_id=db_candidate_id,
                    version=version,
                    candidate_image_url=candidate_image_url,
                    candidate_email=candidate_email,
                    candidate_phone=candidate_phone,
                    candidate_job_title=candidate_job_title,
                    candidate_years_experience=candidate_years_experience,
                    candidate_availability=candidate_availability,
                    candidate_contract_type=candidate_contract_type,
                    flask_base_url=flask_base_url,
                    candidate_uuid=candidate_uuid,
                    candidate_linkedin_url=candidate_linkedin_url,
                    candidate_github_url=candidate_github_url,
                    candidate_behance_url=candidate_behance_url,
                    long_template_path=long_template_path if version == "long" else None,
                    lang=_other_lang
                )
                if not success_other:
                    print(f"❌ [PDF] Génération HTML {_other_lang} échouée: {error_other}")
                    return
                if save_to_minio:
                    save_success, minio_url_other, _ = save_portfolio_html(
                        html_other, db_candidate_id, candidate_uuid, version, lang=_other_lang
                    )
                    if save_success:
                        print(f"✅ [PDF] HTML {_other_lang} sauvegardé dans MinIO: {minio_url_other}")
                pdf_page_format = "one-page" if version == "one-page" else None
                pdf_success, pdf_url_other, pdf_error = convert_html_to_pdf(
                    html_other,
                    db_candidate_id,
                    candidate_uuid,
                    base_url=flask_base_url,
                    pdf_page_format=pdf_page_format,
                    lang=_other_lang
                )
                if pdf_success:
                    with _portfolio_pdf_lock:
                        _portfolio_pdf_generated_at[(db_candidate_id, version, _other_lang)] = _time2.time()
                    print(f"✅ [PDF] PDF {_other_lang} généré et uploadé: {pdf_url_other}")
                    # Sauvegarder l'URL du PDF (on ne garde qu'une URL, peu importe la langue)
                    _save_portfolio_pdf_url(pdf_url_other, version)
                else:
                    print(f"❌ [PDF] Erreur PDF {_other_lang}: {pdf_error}")
            except Exception as e2:
                print(f"❌ [PDF] Exception génération autre langue ({_other_lang}): {e2}")
                import traceback
                traceback.print_exc()
            finally:
                with _portfolio_pdf_lock:
                    _portfolio_pdf_jobs_in_progress.discard((db_candidate_id, version, _other_lang))
        if auto_generate_other_lang:
            try:
                with _portfolio_pdf_lock:
                    _other_job_key = (db_candidate_id, version, _other_lang)
                    _other_already_running = _other_job_key in _portfolio_pdf_jobs_in_progress
                    if not _other_already_running:
                        _portfolio_pdf_jobs_in_progress.add(_other_job_key)
                if _other_already_running:
                    print(f"ℹ️ [PDF] Thread autre langue déjà en cours ({_other_lang}, version={version}), non relancé")
                else:
                    threading.Thread(target=_generate_other_lang_background, daemon=True).start()
                    print(f"🔄 [PDF] Thread autre langue ({_other_lang}, version={version}) lancé")
            except Exception as e2:
                print(f"⚠️ [PDF] Démarrage thread autre langue échoué: {e2}")
        else:
            print(f"ℹ️ [PDF] Auto-génération autre langue désactivée (lang explicite={lang_explicit})")
        
        return jsonify({
            "success": True,
            "version": version,
            "html_content": html_content,
            "minio_url": minio_url,
            "html_minio_url": html_minio_url,
            "message": f"Portfolio HTML généré avec succès (version: {version})"
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération du portfolio HTML: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/portfolio/<candidate_uuid>/pdf-status", methods=["GET"])
def get_portfolio_pdf_status(candidate_uuid):
    """
    Indique si le PDF portfolio est prêt et son timestamp de génération.
    Permet au frontend d'attendre le nouveau PDF après une régénération (éviter d'afficher l'ancien).
    
    Query params:
        db_candidate_id: int (obligatoire)
        version: str (optionnel) - "long" ou "one-page". Défaut: "long".
        lang: str (optionnel) - "fr" ou "en" pour la version linguistique du PDF.
    
    Returns:
        JSON { "ready": true, "generated_at": <unix timestamp> } ou { "ready": false }
    """
    try:
        db_candidate_id = request.args.get("db_candidate_id", type=int)
        version = (request.args.get("version") or "long").strip().lower()
        if version not in ("long", "one-page"):
            version = "long"
        lang = (request.args.get("lang") or "").strip().lower()
        if lang not in ("fr", "en"):
            lang = None
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        lang_suffix = f"_{lang}" if lang else ""
        key = (db_candidate_id, version, lang) if lang else (db_candidate_id, version)
        key_legacy = (db_candidate_id, version)
        with _portfolio_pdf_lock:
            _ts = _portfolio_pdf_generated_at.get(key) or (
                _portfolio_pdf_generated_at.get(key_legacy) if not lang else None
            )
        if _ts is not None:
            return jsonify({"ready": True, "generated_at": _ts})
        storage = get_supabase_storage()
        if not storage or not storage.client:
            return jsonify({"ready": False, "error": "Supabase Storage non initialisé"}), 503

        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
        if version == "one-page":
            object_name = f"{minio_prefix}portfolio_{candidate_uuid}_one-page{lang_suffix}.pdf"
        else:
            object_name = f"{minio_prefix}portfolio_{candidate_uuid}{lang_suffix}.pdf"

        success, _, _ = storage.download_file(object_name)
        if success:
            return jsonify(
                {
                    "ready": True,
                    "generated_at": _portfolio_pdf_generated_at.get(
                        key, _portfolio_pdf_generated_at.get(key_legacy, 0)
                    ),
                }
            )
        return jsonify({"ready": False})
    except Exception as e:
        return jsonify({"ready": False, "error": str(e)}), 500


@app.route("/portfolio/<candidate_uuid>/pdf", methods=["GET"])
def get_portfolio_pdf(candidate_uuid):
    """
    Retourne le PDF du portfolio s'il existe.
    Sans ?raw=1 : retourne une page HTML (favicon TAP + iframe) pour que l'onglet affiche l'icône TAP.
    Avec ?raw=1 : retourne le PDF brut (pour l'iframe).
    
    Query params:
        db_candidate_id: int (obligatoire) - ID du candidat en base de données
        version: str (optionnel) - "long" ou "one-page". Défaut: "long".
        lang: str (optionnel) - "fr" ou "en" pour la version linguistique du PDF.
    """
    if not request.args.get("raw"):
        pdf_url = _build_pdf_preview_url()
        return _pdf_preview_html_wrapper("Portfolio - Aperçu", pdf_url)
    try:
        db_candidate_id = request.args.get("db_candidate_id", type=int)
        version = request.args.get("version", "long").strip().lower()
        if version not in ("long", "one-page"):
            version = "long"
        lang = (request.args.get("lang") or "").strip().lower()
        if lang not in ("fr", "en"):
            lang = None
        
        if not db_candidate_id:
            return jsonify({"error": "db_candidate_id est requis"}), 400
        
        storage = get_supabase_storage()
        if not storage or not storage.client:
            return jsonify({"error": "Supabase Storage non initialisé"}), 503

        minio_prefix = get_candidate_minio_prefix(db_candidate_id)

        # Construire la liste des noms possibles (comme _get_portfolio_pdf_bytes) pour éviter 404
        # quand le fichier existe avec un suffixe langue (_fr, _en) mais que l'URL n'a pas ?lang=
        if version == "one-page":
            candidates = [
                f"{minio_prefix}portfolio_{candidate_uuid}_one-page.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_one-page_fr.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_one-page_en.pdf",
            ]
        else:
            candidates = [
                f"{minio_prefix}portfolio_{candidate_uuid}.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_fr.pdf",
                f"{minio_prefix}portfolio_{candidate_uuid}_en.pdf",
            ]
        # Si une langue est demandée, on met sa variante en premier
        if lang:
            lang_suffix = f"_{lang}"
            if version == "one-page":
                preferred = f"{minio_prefix}portfolio_{candidate_uuid}_one-page{lang_suffix}.pdf"
            else:
                preferred = f"{minio_prefix}portfolio_{candidate_uuid}{lang_suffix}.pdf"
            if preferred not in candidates:
                candidates.insert(0, preferred)
            else:
                candidates = [preferred] + [c for c in candidates if c != preferred]

        success, pdf_bytes, error = False, None, None
        object_name = None
        for candidate_name in candidates:
            success, pdf_bytes, error = storage.download_file(candidate_name)
            if success and pdf_bytes:
                object_name = candidate_name
                break

        if not success:
            user_message = "Ce fichier n'est pas encore genere. Veuillez reessayer dans quelques instants."
            # Par défaut on renvoie une page HTML design pour le navigateur.
            # Le JSON reste disponible via ?format=json (ou client API strict JSON).
            accept_header = (request.headers.get("Accept") or "").lower()
            wants_json = (
                (request.args.get("format") or "").strip().lower() == "json"
                or ("application/json" in accept_header and "text/html" not in accept_header)
            )
            if not wants_json:
                retry_url = request.url
                html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fichier en preparation</title>
  <link rel="icon" type="image/svg+xml" href="/TapIcon.svg">
  <style>
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f5f6f8;
      color: #1f2937;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    .card {{
      width: 100%;
      max-width: 520px;
      background: #fff;
      border-radius: 14px;
      padding: 22px 18px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, .08);
      border: 1px solid #eceef2;
      text-align: center;
    }}
    .badge {{
      display: inline-block;
      margin-bottom: 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .3px;
      text-transform: uppercase;
      color: #b91c1c;
      background: #fee2e2;
      padding: 6px 10px;
      border-radius: 999px;
    }}
    h1 {{ font-size: 1.15rem; margin: 0 0 .55rem 0; }}
    p {{ margin: 0 0 .95rem 0; line-height: 1.45; color: #4b5563; }}
    .actions {{ display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }}
    .btn {{
      display: inline-block;
      text-decoration: none;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 700;
      font-size: 14px;
      border: 1px solid transparent;
    }}
    .btn-primary {{ background: #b91c1c; color: #fff; }}
    .btn-secondary {{ background: #fff; color: #374151; border-color: #d1d5db; }}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Patientez</span>
    <h1>Le fichier n est pas encore disponible</h1>
    <p>{user_message}</p>
    <div class="actions">
      <a class="btn btn-primary" href="{retry_url}">Reessayer</a>
      <a class="btn btn-secondary" href="javascript:history.back()">Retour</a>
    </div>
  </div>
</body>
</html>"""
                return html, 404, {"Content-Type": "text/html; charset=utf-8"}

            # API/JSON: message utilisateur uniquement (sans details techniques MinIO)
            return jsonify({
                "error": "fichier_non_genere",
                "message": user_message
            }), 404
        
        from flask import Response
        filename = f"portfolio_{candidate_uuid}{f'_{lang}' if lang else ''}.pdf"
        headers = {
            'Content-Disposition': f'inline; filename={filename}',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
        key = (db_candidate_id, version, lang) if lang else (db_candidate_id, version)
        with _portfolio_pdf_lock:
            gen_at = _portfolio_pdf_generated_at.get(key) or _portfolio_pdf_generated_at.get((db_candidate_id, version))
        if gen_at is not None:
            headers['X-PDF-Generated-At'] = str(int(gen_at))
        return Response(pdf_bytes, mimetype='application/pdf', headers=headers)
        
    except Exception as e:
        print(f"❌ Erreur lors de la récupération du PDF: {e}")
        return jsonify({"error": str(e)}), 500





@app.post("/api/openclaw/cv-to-talentcard")
def cv_to_talentcard():
    data = request.get_json(silent=True) or {}
    cv_text = data.get("cv_text", "")

    if not cv_text:
        return jsonify({
            "success": False,
            "error": "cv_text is required"
        }), 400

    # Pour le moment test simple
    return jsonify({
        "success": True,
        "message": "Route backend OK",
        "received_cv_text": cv_text,
        "talent_card": {
            "name": "John Doe",
            "skills": ["Python"],
            "summary": "Test talent card"
        }
    })

    
@app.route("/recruit/static/<path:filename>", methods=["GET"])
def serve_recruit_static(filename):
    """
    Sert les fichiers statiques de la page recruteur (images de fond, etc.) depuis le répertoire backend.
    """
    try:
        backend_dir = _BACKEND_DIR
        static_path = os.path.join(backend_dir, filename)
        if not os.path.abspath(static_path).startswith(os.path.abspath(backend_dir)):
            return "Accès non autorisé", 403
        if not os.path.exists(static_path):
            return f"Fichier introuvable: {filename}", 404
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
        }
        ext = os.path.splitext(filename)[1].lower()
        content_type = mime_types.get(ext, "application/octet-stream")
        return send_file(static_path, mimetype=content_type)
    except Exception as e:
        print(f"❌ Erreur serve_recruit_static {filename}: {e}")
        return f"Erreur: {str(e)}", 500


@app.route("/portfolio/static/<path:filename>", methods=["GET"])
def serve_portfolio_static(filename):
    """
    Sert les fichiers statiques du portfolio (CSS, images, etc.)
    """
    try:
        # Obtenir le répertoire racine du projet
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        static_path = os.path.join(project_root, "frontend", "src", "20260312_044613", filename)
        
        # Sécurité : vérifier que le fichier est dans le bon répertoire
        static_dir = os.path.join(project_root, "frontend", "src", "20260312_044613")
        if not os.path.abspath(static_path).startswith(os.path.abspath(static_dir)):
            return "Accès non autorisé", 403
        
        if not os.path.exists(static_path):
            return f"Fichier introuvable: {filename}", 404
        
        # Déterminer le type MIME
        mime_types = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
        }
        ext = os.path.splitext(filename)[1].lower()
        content_type = mime_types.get(ext, 'application/octet-stream')
        
        return send_file(static_path, mimetype=content_type)
        
    except Exception as e:
        print(f"❌ Erreur lors du service du fichier statique {filename}: {e}")
        return f"Erreur: {str(e)}", 500


@app.route("/talent/static/<path:filename>", methods=["GET"])
def serve_talent_static(filename):
    """
    Sert les fichiers statiques de la Talent Card (SVG, images de fond, QR, etc.)
    depuis frontend/src/talent card html/.
    Requis pour que les icônes et images s'affichent quand l'app est derrière un proxy (ex: https://demo.tap-hr.com).
    """
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        static_dir = os.path.join(project_root, "frontend", "src", "talent card html")
        static_path = os.path.join(static_dir, filename)
        if not os.path.abspath(static_path).startswith(os.path.abspath(static_dir)):
            return "Accès non autorisé", 403
        if not os.path.exists(static_path):
            return f"Fichier introuvable: {filename}", 404
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
        }
        ext = os.path.splitext(filename)[1].lower()
        content_type = mime_types.get(ext, "application/octet-stream")
        return send_file(static_path, mimetype=content_type)
    except Exception as e:
        print(f"❌ Erreur serve_talent_static {filename}: {e}")
        return f"Erreur: {str(e)}", 500


@app.route("/static/TapIcon.svg", methods=["GET"])
@app.route("/TapIcon.svg", methods=["GET"])
def serve_tap_favicon():
    """Sert le favicon TAP pour les pages d'aperçu (CV, Talent Card) afin que l'onglet affiche l'icône TAP."""
    try:
        icon_path = os.path.join(_PROJECT_ROOT, "frontend", "public", "TapIcon.svg")
        if not os.path.exists(icon_path):
            return "Favicon introuvable", 404
        return send_file(icon_path, mimetype="image/svg+xml")
    except Exception as e:
        print(f"❌ Erreur serve_tap_favicon: {e}")
        return "Erreur", 500


def _build_pdf_preview_url():
    """
    Construit l'URL du PDF pour l'iframe (avec raw=1).
    En HTTPS derrière Nginx : utilise X-Forwarded-Proto et préfixe /api pour éviter Mixed Content.
    """
    scheme = "https" if request.headers.get("X-Forwarded-Proto") == "https" else request.scheme
    # Derrière le proxy Nginx, le backend reçoit le chemin sans /api ; le navigateur doit appeler /api/...
    if request.headers.get("X-Forwarded-Proto"):
        base_path = "/api" + request.path
    else:
        base_path = request.path
    # request.query_string peut être bytes (WSGI) → toujours convertir en str
    qs = request.query_string
    if qs:
        qs_str = qs.decode("utf-8") if isinstance(qs, bytes) else str(qs)
        query = "?" + qs_str
        raw_sep = "&"
    else:
        query = ""
        raw_sep = "?"
    return f"{scheme}://{request.host}{base_path}{query}{raw_sep}raw=1"


def _pdf_preview_html_wrapper(title: str, pdf_url: str) -> str:
    """Retourne une page HTML avec favicon TAP et iframe pour afficher le PDF (évite l'icône par défaut dans l'onglet)."""
    # /TapIcon.svg : en production (proxy) = frontend ; en standalone = backend (route ci-dessus)
    favicon_url = "/TapIcon.svg"
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <link rel="icon" type="image/svg+xml" href="{favicon_url}">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{ height: 100%; }}
    iframe {{ width: 100%; height: 100%; border: none; }}
  </style>
</head>
<body>
  <iframe src="{pdf_url}" title="{title}"></iframe>
</body>
</html>"""


@app.route("/minio-proxy/<path:object_path>", methods=["GET"])
def minio_proxy(object_path):
    """
    Endpoint proxy pour servir les fichiers depuis le stockage (Supabase).
    Conserve l'URL historique `/minio-proxy/...` pour compatibilité.
    """
    try:
        storage = get_supabase_storage()

        if not storage or not storage.client:
            return jsonify({"error": "Stockage non disponible"}), 503

        # Télécharger le fichier depuis Supabase Storage
        success, file_bytes, error = storage.download_file(object_path)

        if not success or not file_bytes:
            print(f"❌ Erreur proxy stockage pour {object_path}: {error}")
            return jsonify({"error": f"Fichier non trouvé: {error}"}), 404

        # Déterminer le type MIME de base
        _, ext = os.path.splitext(object_path.lower())
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".json": "application/json",
        }
        content_type = mime_map.get(ext, "application/octet-stream")

        return send_file(
            BytesIO(file_bytes),
            mimetype=content_type,
            as_attachment=False,
            download_name=os.path.basename(object_path),
        )

    except Exception as e:
        print(f"❌ Erreur inattendue proxy stockage: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route('/api/recruteur/match-by-offre', methods=['POST'])
def match_by_offre():
    """
    Lance le matching (A4.test) pour une offre : candidats triés par score avec détail des scores + infos candidat.
    Body: { "job_id": int, "domaine_activite": "DEV" (optionnel), "top_n": 20 (optionnel) }.
    Retourne: { job_id, job_title, candidates: [ { scores + candidate } ] }.
    """
    data = request.get_json() or {}
    job_id = data.get("job_id")
    if not job_id:
        return jsonify({"error": "Le champ 'job_id' est requis"}), 400
    try:
        job_id = int(job_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id doit être un entier"}), 400
    domaine_activite = (data.get("domaine_activite") or "").strip().upper() or None
    categorie_profil = (data.get("categorie_profil") or "").strip() or None
    top_n = data.get("top_n", 20)
    only_postule = bool(data.get("only_postule"))
    try:
        top_n = min(max(1, int(top_n)), 100)
    except (TypeError, ValueError):
        top_n = 20
    try:
        import pandas as pd
        from A4.test import (
            load_candidates_df,
            get_job_offer_from_job_id,
            find_matching_candidates,
        )
        job_offer = get_job_offer_from_job_id(job_id)
        if not job_offer:
            return jsonify({"error": "Offre introuvable", "job_id": job_id}), 404
        # Domaine exact : priorité à categorie_profil (dev, data, design...) puis domaine_activite (DATA, DEV...)
        req_categorie = (data.get("categorie_profil") or "").strip() or None
        domaine_for_filter = (job_offer.get("categorie_profil") or job_offer.get("domaine_activite") or req_categorie or domaine_activite or "").strip() or None
        # Si toujours vide, lire directement en base Supabase (au cas où load_job_criteria n'a pas retourné ces champs)
        if not domaine_for_filter and supabase_db is not None:
            try:
                resp = (
                    supabase_db.table("jobs")
                    .select("categorie_profil, domaine_activite")
                    .eq("id", job_id)
                    .limit(1)
                    .execute()
                )
                row = resp.data[0] if resp.data else None
                if row:
                    domaine_for_filter = (
                        (row.get("categorie_profil") or row.get("domaine_activite") or "").strip()
                        or None
                    )
            except Exception as e:
                print(f"⚠️ Erreur lecture domaine offre depuis Supabase: {e}")
        applied_ids: list[int] = []
        if only_postule and supabase_db is not None:
            try:
                resp_post = (
                    supabase_db.table("candidate_postule")
                    .select("candidate_id")
                    .eq("job_id", job_id)
                    .execute()
                )
                rows = resp_post.data or []
                applied_ids = [r.get("candidate_id") for r in rows if r.get("candidate_id") is not None]
            except Exception as e:
                print(f"⚠️ Erreur lecture candidate_postule depuis Supabase: {e}")

        # Sans domaine, on reste strict sauf en mode only_postule (où on peut matcher sur les postulants de l'offre).
        if not domaine_for_filter and not only_postule:
            return jsonify({
                "job_id": job_id,
                "job_title": (job_offer.get("title") or job_offer.get("required_title") or "").strip(),
                "candidates": [],
                "message": "Précisez le domaine d'activité ou la catégorie de l'offre pour afficher les candidats matchés.",
            })

        # Normaliser pour matcher la colonne candidats.categorie_profil (dev, data, design, video, autre)
        from candidate_minio_path import normalize_categorie_profil
        categorie_canonique = normalize_categorie_profil(domaine_for_filter) if domaine_for_filter else None
        df = load_candidates_df(categorie_canonique) if categorie_canonique else load_candidates_df(None)

        # Si le filtre domaine ne trouve rien mais qu'on veut les postulants de l'offre, fallback sur tous les candidats.
        if df.empty and categorie_canonique and only_postule:
            df = load_candidates_df(None)

        if df.empty:
            return jsonify({
                "job_id": job_id,
                "job_title": job_offer.get("title") or job_offer.get("required_title") or "",
                "candidates": [],
                "message": "Aucun candidat pour ce domaine.",
            })

        # Ne garder que les candidats qui ont effectivement postulé à cette offre
        if only_postule:
            if not applied_ids:
                return jsonify({
                    "job_id": job_id,
                    "job_title": job_offer.get("title") or job_offer.get("required_title") or "",
                    "candidates": [],
                    "message": "Aucun candidat n'a encore postulé à cette offre.",
                })
            df = df[df["candidate_id"].isin(applied_ids)]
            if df.empty:
                return jsonify({
                    "job_id": job_id,
                    "job_title": job_offer.get("title") or job_offer.get("required_title") or "",
                    "candidates": [],
                    "message": "Aucun candidat correspondant parmi ceux qui ont postulé.",
                })

        results_df = find_matching_candidates(job_offer, df, top_n=top_n)

        # --- Hybrid scoring: règles A4 + sémantique embeddings ---
        # global_score A4 est déjà un pourcentage [0..100].
        # On ajoute:
        # - semantic_score (offre complète vs profil candidat)
        # - skills_embedding_score (skills offre vs skills candidat)
        # puis on combine les trois scores.
        def _to_pct_from_cosine(sim):
            # cosine [-1..1] -> [0..100]
            try:
                return max(0.0, min(100.0, ((float(sim) + 1.0) / 2.0) * 100.0))
            except Exception:
                return None

        def _skills_text_from_value(value):
            if value is None:
                return ""
            if isinstance(value, str):
                s = value.strip()
                if not s:
                    return ""
                # JSON list string fallback
                if s.startswith("["):
                    try:
                        parsed = json.loads(s)
                        return _skills_text_from_value(parsed)
                    except Exception:
                        return s
                return s
            if isinstance(value, list):
                out = []
                for x in value:
                    if isinstance(x, dict):
                        name = (x.get("name") or "").strip()
                        if name:
                            out.append(name)
                    elif isinstance(x, str) and x.strip():
                        out.append(x.strip())
                return ", ".join(out)
            return str(value).strip()

        # 1) Embedding offre (réutiliser la colonne jobs.embedding si possible)
        job_embedding = None
        job_skills_embedding = None
        if supabase_db is not None:
            try:
                resp_job_emb = (
                    supabase_db.table("jobs")
                    .select("embedding, title, categorie_profil, niveau_attendu, niveau_seniorite, experience_min, contrat, entreprise, presence_sur_site, location_type, disponibilite, reason, main_mission, tasks_other, skills")
                    .eq("id", job_id)
                    .limit(1)
                    .execute()
                )
                job_row = resp_job_emb.data[0] if resp_job_emb.data else None
                if job_row:
                    job_embedding = parse_embedding(job_row.get("embedding"))
                    if not job_embedding:
                        # fallback: générer à la volée avec le même format que /api/offres/embed
                        job_text = _build_job_embedding_text_from_payload(job_row)
                        if job_text:
                            job_embedding = generer_embedding(job_text, task_type="RETRIEVAL_DOCUMENT")
                    job_skills_text = _skills_text_from_value(job_row.get("skills"))
                    if job_skills_text:
                        job_skills_embedding = generer_embedding(job_skills_text, task_type="RETRIEVAL_DOCUMENT")
            except Exception as e:
                print(f"⚠️ Erreur génération embedding offre pour matching recruteur: {e}")

        candidates_out = []
        for _, row in results_df.iterrows():
            cid = row.get("candidate_id")
            score_row = {k: (None if (isinstance(v, float) and pd.isna(v)) else v) for k, v in row.to_dict().items()}
            full_row = df[df["candidate_id"] == cid]
            candidate_info = full_row.iloc[0].to_dict() if len(full_row) else {}
            for k, v in list(candidate_info.items()):
                if hasattr(v, "isoformat"):
                    candidate_info[k] = v.isoformat()
                elif isinstance(v, float) and pd.isna(v):
                    candidate_info[k] = None
            # 2) Embeddings candidat
            semantic_pct = None
            skills_pct = None
            if cid is not None and job_embedding:
                try:
                    # Priorité cache DB (table candidate_embeddings), sinon calcul dynamique.
                    cand_embedding = None
                    if supabase_db is not None:
                        try:
                            resp_cand_emb = (
                                supabase_db.table("candidate_embeddings")
                                .select("embedding")
                                .eq("candidate_id", int(cid))
                                .limit(1)
                                .execute()
                            )
                            emb_row = resp_cand_emb.data[0] if resp_cand_emb.data else None
                            cand_embedding = parse_embedding((emb_row or {}).get("embedding"))
                        except Exception:
                            cand_embedding = None

                    if not cand_embedding:
                        cand_title = (candidate_info.get("titre_profil") or score_row.get("name") or "").strip()
                        cand_resume = (candidate_info.get("resume_bref") or "").strip()
                        cand_skills_text = _skills_text_from_value(candidate_info.get("skills"))
                        cand_lang_text = _skills_text_from_value(candidate_info.get("languages"))
                        cand_text = " | ".join([p for p in [cand_title, cand_resume, cand_skills_text, cand_lang_text] if p])
                        if cand_text:
                            cand_embedding = generer_embedding(cand_text, task_type="RETRIEVAL_QUERY")

                    if cand_embedding:
                        semantic_sim = calculer_similarite(cand_embedding, job_embedding)
                        semantic_pct = _to_pct_from_cosine(semantic_sim)

                        if job_skills_embedding:
                            cand_skills_text = _skills_text_from_value(candidate_info.get("skills"))
                            if cand_skills_text:
                                cand_skills_embedding = generer_embedding(cand_skills_text, task_type="RETRIEVAL_QUERY")
                                if cand_skills_embedding:
                                    skills_sim = calculer_similarite(cand_skills_embedding, job_skills_embedding)
                                    skills_pct = _to_pct_from_cosine(skills_sim)
                except Exception as e:
                    print(f"⚠️ Erreur scoring embedding candidat {cid}: {e}")

            rule_score = float(score_row.get("global_score") or 0.0)
            # Poids hybrides:
            # - 70% score règles A4
            # - 20% similarité sémantique globale
            # - 10% similarité embedding des skills
            final_score = (
                0.70 * rule_score
                + 0.20 * (semantic_pct if semantic_pct is not None else rule_score)
                + 0.10 * (skills_pct if skills_pct is not None else (semantic_pct if semantic_pct is not None else rule_score))
            )
            final_score = round(max(0.0, min(100.0, final_score)), 1)

            candidates_out.append({
                "candidate_id": score_row.get("candidate_id"),
                "name": score_row.get("name"),
                # On expose les composantes pour debug/transparence.
                "global_score_rule": round(rule_score, 1),
                "semantic_score": round(semantic_pct, 1) if semantic_pct is not None else None,
                "skills_embedding_score": round(skills_pct, 1) if skills_pct is not None else None,
                "global_score": final_score,
                "skill_score": score_row.get("skill_score"),
                "experience_score": score_row.get("experience_score"),
                "language_score": score_row.get("language_score"),
                "seniority_score": score_row.get("seniority_score"),
                "titre_profil_score": score_row.get("titre_profil_score"),
                "disponibilite_score": score_row.get("disponibilite_score"),
                "contract_score": score_row.get("contract_score"),
                "pret_a_relocater_score": score_row.get("pret_a_relocater_score"),
                "pays_cible_score": score_row.get("pays_cible_score"),
                "realisations_score": score_row.get("realisations_score"),
                "salaire_minimum_score": score_row.get("salaire_minimum_score"),
                "missing_skills": score_row.get("missing_skills"),
                "candidate": candidate_info,
            })
        return jsonify({
            "job_id": job_id,
            "job_title": (job_offer.get("title") or job_offer.get("required_title") or "").strip(),
            "candidates": candidates_out,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/candidates', methods=['GET'])
def get_recruteur_candidates():
    """Liste des candidats pour le tri (optionnel: filtrer par domaine = DATA, DEV, DESIGN, VIDEO, AUTRE)."""
    domaine = (request.args.get("domaine") or "").strip().upper()
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        categorie = normalize_categorie_profil(domaine) if domaine else None
        query = supabase_db.table("candidates").select(
            "id, id_agent, candidate_uuid, nom, prenom, titre_profil, categorie_profil, "
            "ville, pays, annees_experience, disponibilite, niveau_seniorite, "
            "skills_csv, skills"
        )
        if categorie:
            query = query.eq("categorie_profil", categorie)
        resp = query.order("id").execute()
        rows = resp.data or []
        out = []
        for row in rows:
            r = dict(row)
            for k, v in list(r.items()):
                if hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
            if r.get("candidate_uuid") in (None, ""):
                r["candidate_uuid"] = r.get("id_agent") or ""

            # skills : prioriser skills_csv, fallback sur skills JSON
            skills_list: list[str] = []
            if r.get("skills_csv"):
                skills_list = [s.strip() for s in (r.get("skills_csv") or "").split(",") if s.strip()]
            elif r.get("skills"):
                val = r.get("skills")
                if isinstance(val, str):
                    try:
                        val = json.loads(val)
                    except Exception:
                        val = []
                if isinstance(val, list):
                    skills_list = [str(x).strip() for x in val if str(x).strip()]

            r.pop("skills_csv", None)
            r["skills"] = skills_list
            out.append(r)
        return jsonify({"candidates": out})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/candidate-by-domaine', methods=['GET'])
def get_one_candidate_by_domaine():
    """Retourne 1 candidat dont le domaine d'activité correspond (DATA, DEV, DESIGN, VIDEO, AUTRE)."""
    domaine = (request.args.get("domaine") or "").strip().upper()
    if not domaine:
        return jsonify({"error": "Paramètre 'domaine' requis (DATA, DEV, DESIGN, VIDEO, AUTRE)"}), 400
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        categorie = normalize_categorie_profil(domaine)
        resp = (
            supabase_db.table("candidates")
            .select(
                "id, id_agent, nom, prenom, titre_profil, categorie_profil, ville, pays, email, phone, "
                "annees_experience, disponibilite, niveau_seniorite, talentcard_minio_url, talentcard_pdf_minio_url"
            )
            .eq("categorie_profil", categorie)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
        if not row:
            return jsonify({"error": f"Aucun candidat pour le domaine '{domaine}'", "candidate": None}), 404
        for k, v in list(row.items()):
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
        return jsonify({"candidate": row})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/match-candidates', methods=['POST'])
def match_candidates_weighted():
    """
    Niveau 2 — Matching pondéré intelligent.
    Body: { "job_id": int, "domaine_activite": "DEV" (optionnel), "top_n": 20 (optionnel) }.
    Retourne les candidats triés par score (skills obligatoires=3, optionnelles=1, expérience=poids variable, similarité sémantique TF-IDF).
    """
    data = request.get_json() or {}
    job_id = data.get("job_id")
    if not job_id:
        return jsonify({"error": "Le champ 'job_id' est requis"}), 400
    try:
        job_id = int(job_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id doit être un entier"}), 400
    domaine_activite = (data.get("domaine_activite") or "").strip().upper() or None
    top_n = data.get("top_n", 20)
    try:
        top_n = min(max(1, int(top_n)), 100)
    except (TypeError, ValueError):
        top_n = 20
    try:
        from A4.weighted_matching import weighted_match
        results = weighted_match(
            domaine_activite=domaine_activite,
            job_id=job_id,
            top_n=top_n,
        )
        out = []
        for r in results:
            c = r["candidate"]
            for k, v in list(c.items()):
                if hasattr(v, "isoformat"):
                    c[k] = v.isoformat()
            out.append({
                "candidate": c,
                "score": r["score"],
                "detail": r["detail"],
            })
        return jsonify({"candidates": out})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/match', methods=['POST'])
def match_agent():
    """
    Agent de matching sémantique (embeddings + justification LLM).
    Body: { "job_id": int, "top_n": 20 (optionnel), "with_explanation": true (optionnel) }.
    Retourne: [ { candidate_id, score, similarity_score, explanation, strengths, weaknesses } ].
    """
    data = request.get_json() or {}
    job_id = data.get("job_id")
    if not job_id:
        return jsonify({"error": "Le champ 'job_id' est requis"}), 400
    try:
        job_id = int(job_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id doit être un entier"}), 400
    top_n = data.get("top_n", 20)
    try:
        top_n = min(max(1, int(top_n)), 100)
    except (TypeError, ValueError):
        top_n = 20
    with_explanation = data.get("with_explanation", True)
    try:
        from A4.agent.pipeline import MatchingPipeline
        from A4.agent.justification import JustificationService
        pipeline = MatchingPipeline()
        results = pipeline.run(job_id=job_id, top_n=top_n, apply_feedback=True)
        if with_explanation and results:
            justification = JustificationService()
            results = justification.explain_batch(job_id, results, with_explanation=True)
        return jsonify(results)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/match/feedback', methods=['POST'])
def match_feedback():
    """
    Enregistre une décision recruteur (sélectionné / rejeté) pour apprentissage.
    Body: { "job_id": int, "candidate_id": int, "decision": "selected" | "rejected" }.
    """
    data = request.get_json() or {}
    job_id = data.get("job_id")
    candidate_id = data.get("candidate_id")
    decision = (data.get("decision") or "").strip().lower()
    if not job_id or not candidate_id:
        return jsonify({"error": "job_id et candidate_id sont requis"}), 400
    if decision not in ("selected", "rejected"):
        return jsonify({"error": "decision doit être 'selected' ou 'rejected'"}), 400
    try:
        from A4.agent.feedback import record_feedback
        ok = record_feedback(int(job_id), int(candidate_id), decision)
        return jsonify({"ok": ok})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/validated-candidates', methods=['GET'])
def get_validated_candidates():
    """
    Liste des candidats validés par le recruteur pour une offre.
    Query: job_id (requis). Retourne: { validated_ids: [int], validated: [{ id, job_id, candidate_id, validated_at, note }] }.
    """
    job_id = request.args.get('job_id')
    if not job_id:
        return jsonify({"error": "job_id est requis"}), 400
    try:
        job_id = int(job_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id doit être un entier"}), 400
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        resp = (
            supabase_db.table("candidate_postule")
            .select("id, job_id, candidate_id, validated_at, note, validate, use_tap_cv, status")
            .eq("job_id", job_id)
            .order("validated_at", desc=True)
            .execute()
        )
        rows = resp.data or []
        out = []
        validated_ids = []
        for r in rows:
            row = dict(r)
            out.append(row)
            cid = row.get("candidate_id")
            if cid is not None:
                validated_ids.append(cid)
        return jsonify({"validated_ids": validated_ids, "validated": out})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/validated-candidates', methods=['POST'])
def add_validated_candidate():
    """
    Enregistre un candidat comme validé (postulation) pour une offre.
    Body: { "job_id": int, "candidate_id": int, "use_tap_cv": bool (optionnel, True = CV TAP, False = ancien CV) }.
    """
    data = request.get_json() or {}
    job_id = data.get("job_id")
    candidate_id = data.get("candidate_id")
    use_tap_cv = data.get("use_tap_cv")
    if not job_id or not candidate_id:
        return jsonify({"error": "job_id et candidate_id sont requis"}), 400
    try:
        job_id, candidate_id = int(job_id), int(candidate_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id et candidate_id doivent être des entiers"}), 400
    # use_tap_cv: True = CV TAP, False = ancien CV. Par défaut True si le candidat envoie True ou n'envoie rien.
    use_tap_cv_val = 1 if (use_tap_cv is None or use_tap_cv is True) else 0
    # Nouveau : colonne status sur candidate_postule.
    # Par défaut, la création passe par un statut "pending" (en attente de décision finale).
    status_val = "pending"
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        supabase_payload = {
            "job_id": job_id,
            "candidate_id": candidate_id,
            "use_tap_cv": bool(use_tap_cv_val),
            "status": status_val,
        }
        # On suppose qu'une contrainte UNIQUE existe sur (job_id, candidate_id)
        supabase_db.table("candidate_postule").upsert(
            supabase_payload,
            on_conflict="job_id,candidate_id",
        ).execute()
        print(
            f"✅ Candidature synchronisée dans Supabase "
            f"(job_id={job_id}, candidate_id={candidate_id}, status={status_val})"
        )

        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/validated-candidates', methods=['DELETE'])
def remove_validated_candidate():
    """
    Retire un candidat des validés pour une offre.
    Body ou query: job_id, candidate_id.
    """
    data = request.get_json() or {}
    job_id = data.get("job_id") or request.args.get("job_id")
    candidate_id = data.get("candidate_id") or request.args.get("candidate_id")
    if not job_id or not candidate_id:
        return jsonify({"error": "job_id et candidate_id sont requis"}), 400
    try:
        job_id, candidate_id = int(job_id), int(candidate_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id et candidate_id doivent être des entiers"}), 400
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        resp = (
            supabase_db.table("candidate_postule")
            .update({"status": "rejected"})
            .eq("job_id", job_id)
            .eq("candidate_id", candidate_id)
            .execute()
        )
        affected = len(resp.data or [])

        if affected == 0:
            return jsonify({"ok": False, "message": "Aucune candidature trouvée pour ce couple job/candidate"}), 404
        return jsonify({"ok": True, "status": "rejected"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recruteur/interview-questions', methods=['POST'])
def get_interview_questions_for_candidate():
    """
    Génère une liste de questions d'entretien à poser au candidat validé,
    à partir de son CV. Body: { "candidate_id": int, "job_id": int (optionnel) }.
    """
    data = request.get_json() or {}
    candidate_id = data.get("candidate_id")
    if candidate_id is None:
        return jsonify({"success": False, "questions": [], "error": "candidate_id requis"}), 400
    try:
        candidate_id = int(candidate_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "questions": [], "error": "candidate_id doit être un entier"}), 400

    job_title = None
    job_id = data.get("job_id")
    if job_id is not None and supabase_db is not None:
        try:
            resp = supabase_db.table("jobs").select("title").eq("id", int(job_id)).limit(1).execute()
            rows = resp.data or []
            if rows and rows[0].get("title"):
                job_title = rows[0]["title"]
        except Exception:
            job_title = None

    from A4.entretien_question import get_interview_questions_for_validated_candidate
    result = get_interview_questions_for_validated_candidate(
        candidate_id=candidate_id,
        job_title=job_title,
    )
    if not result.get("success"):
        return jsonify(result), 400
    return jsonify(result)


@app.route('/api/recruteur/candidate-postule/status', methods=['POST'])
def update_candidate_postule_status():
    """
    Met à jour le status d'une candidature (candidate_postule) pour une offre donnée.
    Utilisé pour refléter l'état de la demande du candidat :
      - 'pending'  : demande en cours, pas encore consultée
      - 'seen'     : consultée par le recruteur
      - 'accepted' : acceptée (utiliser de préférence /api/recruteur/validated-candidates pour valider)
      - 'rejected' : refusée
    Body JSON: { "job_id": int, "candidate_id": int, "status": str }
    """
    data = request.get_json() or {}
    job_id = data.get("job_id")
    candidate_id = data.get("candidate_id")
    new_status = (data.get("status") or "").strip().lower()

    if not job_id or not candidate_id or not new_status:
        return jsonify({"error": "job_id, candidate_id et status sont requis"}), 400

    allowed_status = {"pending", "seen", "accepted", "rejected"}
    if new_status not in allowed_status:
        return jsonify({
            "error": "status invalide",
            "allowed": sorted(list(allowed_status)),
        }), 400

    try:
        job_id = int(job_id)
        candidate_id = int(candidate_id)
    except (TypeError, ValueError):
        return jsonify({"error": "job_id et candidate_id doivent être des entiers"}), 400

    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        resp = (
            supabase_db.table("candidate_postule")
            .update({"status": new_status})
            .eq("job_id", job_id)
            .eq("candidate_id", candidate_id)
            .execute()
        )
        affected = len(resp.data or [])

        if affected == 0:
            return jsonify({"error": "Aucune candidature trouvée pour ce couple job/candidate"}), 404

        return jsonify({"ok": True, "status": new_status}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/candidate/<int:db_candidate_id>/domaine', methods=['GET'])
def get_candidate_domaine(db_candidate_id):
    """Retourne le domaine d'activité du candidat (categorie_profil) pour filtrer les offres."""
    try:
        info = _get_candidate_info(db_candidate_id, ['categorie_profil'])
        return jsonify({
            "categorie_profil": (info.get('categorie_profil') or '').strip() or None,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/candidate/<int:db_candidate_id>/has-corrected-cv', methods=['GET'])
def get_candidate_has_corrected_cv(db_candidate_id):
    """Indique si le candidat dispose d'un CV TAP (corrigé) généré. Utilisé pour proposer le choix CV TAP / ancien CV à la postulation."""
    try:
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        # La colonne en base est corrected_pdf_minio_url (et non corrected_pdf_url)
        resp = (
            supabase_db.table("fichiers_versions")
            .select("id, corrected_pdf_minio_url")
            .eq("candidate_id", db_candidate_id)
            .not_.is_("corrected_pdf_minio_url", None)
            .limit(1)
            .execute()
        )
        has = bool(resp.data)
        return jsonify({"has_corrected_cv": has})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """Liste les offres déjà saisies (pour l'espace recruteur). Optionnel: ?domaine=xxx pour filtrer par domaine d'activité.
    Utilise les colonnes réelles de la table jobs pour retourner toutes les infos saisies."""
    try:
        domaine_param = (request.args.get('domaine') or request.args.get('categorie_profil') or '').strip()
        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        # On sélectionne toutes les colonnes utiles de la table jobs dans Supabase
        resp = supabase_db.table("jobs").select("*").order("created_at", desc=True).execute()
        rows = resp.data or []

        out = []
        json_keys = {"location_type", "tasks", "soft_skills", "skills", "languages"}
        for r in rows:
            row = dict(r)
            for k, v in list(row.items()):
                if k in json_keys and isinstance(v, str) and v:
                    try:
                        row[k] = json.loads(v) if v.strip().startswith(("[", "{")) else v
                    except (ValueError, TypeError):
                        pass
            out.append(row)

        if domaine_param:
            dom_lower = domaine_param.lower()
            out = [
                r for r in out
                if (r.get('categorie_profil') or r.get('domaine_activite') or '').strip().lower() == dom_lower
            ]
        return jsonify({"jobs": out})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/jobs', methods=['POST'])
def create_job():
    """Enregistre une offre (Job Spec) en base et retourne job_id."""
    data = request.get_json() or {}
    if not data.get('title'):
        return jsonify({"error": "Le champ 'title' (poste) est requis"}), 400
    try:
        from candidate_minio_path import normalize_categorie_profil
        # Récupérer l'id du recruteur à partir du token JWT (si présent)
        recruiter_user_id = None
        try:
            from auth import _decode_token_from_request
            payload, _ = _decode_token_from_request()
            if payload:
                role = (payload.get("role") or "").strip().lower()
                if role == "recruteur":
                    recruiter_user_id = payload.get("sub")
        except Exception:
            recruiter_user_id = None

        if supabase_db is None:
            return jsonify({"error": "Supabase DB non configurée"}), 503

        # La colonne en base est categorie_profil (pas domaine_activite) : on y stocke le domaine d'activité du formulaire
        dom = (data.get('domaine_activite') or '').strip() or ''
        categorie_profil_value = (normalize_categorie_profil(dom) or None) if dom else None
        salary_min = data.get('salary_min')
        salary_max = data.get('salary_max')
        try:
            salary_min = float(salary_min) if salary_min not in (None, '') else None
        except (TypeError, ValueError):
            salary_min = None
        try:
            salary_max = float(salary_max) if salary_max not in (None, '') else None
        except (TypeError, ValueError):
            salary_max = None

        # Normaliser / tronquer certains champs texte pour respecter les longueurs SQL
        raw_tasks_other = data.get('tasks_other') or None
        tasks_other_value = None
        if isinstance(raw_tasks_other, str):
            raw_tasks_other = raw_tasks_other.strip()
            if raw_tasks_other:
                # Colonne typiquement VARCHAR(255)
                tasks_other_value = raw_tasks_other[:255]

        # Préparer le texte pour l'embedding de l'offre : titre + domaine + mission + contexte + compétences
        skills_raw = data.get('skills') or []
        skill_names = []
        for s in skills_raw:
            if isinstance(s, dict):
                name = s.get("name") or s.get("nom")
                if name:
                    skill_names.append(str(name))
            elif s:
                skill_names.append(str(s))
        skills_text = ", ".join(skill_names)
        embedding_parts = [
            data.get('title') or "",
            dom or (categorie_profil_value or "") or "",
            data.get('reason') or "",
            data.get('main_mission') or "",
            skills_text,
        ]
        job_embedding_text = " | ".join(
            [part for part in embedding_parts if part and str(part).strip()]
        )
        job_embedding = generer_embedding(job_embedding_text) if job_embedding_text else None
        job_embedding_json = embedding_to_json(job_embedding)

        # Insertion directe dans Supabase
        sup_payload = {
            "title": (data.get('title') or "")[:255],
            "entreprise": (data.get('entreprise') or None),
            "categorie_profil": categorie_profil_value,
            "niveau_attendu": (data.get('niveau_attendu') or None),
            "niveau_seniorite": (data.get('niveau_seniorite') or None),
            "experience_min": data.get('experience_min'),
            "presence_sur_site": data.get('presence_sur_site'),
            "reason": data.get('reason') or None,
            "main_mission": data.get('main_mission') or None,
            "tasks_other": tasks_other_value,
            "disponibilite": data.get('disponibilite') or None,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "urgent": bool(data.get('urgent')),
            "location_type": json.dumps(data.get('location_type', [])),
            "tasks": json.dumps(data.get('tasks', [])),
            "soft_skills": json.dumps(data.get('soft_skills', [])),
            "skills": json.dumps(data.get('skills', [])),
            "languages": json.dumps(data.get('languages', [])),
            # Supabase: la colonne s'appelle 'contrat' (pas 'type_contrat')
            "contrat": data.get('type_contrat') or None,
            "embedding": job_embedding_json,
        }
        if recruiter_user_id:
            sup_payload["user_id"] = recruiter_user_id

        resp = supabase_db.table("jobs").insert(sup_payload).execute()
        inserted = (resp.data or [{}])[0]
        job_id = inserted.get("id")

        print(f"✅ Job {job_id} (embedding) créé dans Supabase")
        return jsonify({"job_id": job_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500





@app.route('/api/scoring/<db_candidate_id>', methods=['GET', 'POST'])
def scoring_candidate(db_candidate_id):
    """
    Route pour le scoring et l'analyse A2 d'un candidat.
    POST: Construit le chemin MinIO vers le JSON via l'UUID et lance l'agent.
    """
    try:
        def _safe_float(value, default=0.0):
            try:
                return float(value)
            except (TypeError, ValueError):
                return default

        def _extract_skills_payload(payload):
            if not isinstance(payload, dict):
                return []

            raw_skills = (
                payload.get('skills')
                or payload.get('competencies')
                or payload.get('competences')
                or []
            )
            if not isinstance(raw_skills, list):
                return []

            skills = []
            for item in raw_skills:
                if not isinstance(item, dict):
                    continue

                name = item.get('name') or item.get('original_name') or item.get('normalized_name')
                if not name:
                    continue

                scope = item.get('scope')
                if not scope and isinstance(item.get('exp_context'), dict):
                    scope = item['exp_context'].get('scope')

                skills.append({
                    'name': str(name),
                    'score': _safe_float(item.get('score')),
                    'status': str(item.get('status') or 'declare'),
                    'scope': str(scope or 'individuel')
                })

            skills.sort(key=lambda x: x.get('score', 0.0), reverse=True)
            return skills

        if request.method == 'POST':
            # 1. Récupérer l'UUID du candidat en base (Supabase)
            if supabase_db is None:
                return jsonify({'success': False, 'message': 'Supabase DB non configurée'}), 503

            candidate_uuid = None
            try:
                resp_candidate = (
                    supabase_db.table("candidates")
                    .select("candidate_uuid")
                    .eq("id", db_candidate_id)
                    .limit(1)
                    .execute()
                )
                rows_cand = resp_candidate.data or []
                if rows_cand:
                    candidate_uuid = rows_cand[0].get("candidate_uuid")
            except Exception as e:
                print(f"⚠️ Erreur récupération candidate_uuid dans Supabase: {e}")

            if not candidate_uuid:
                return jsonify({'success': False, 'message': 'UUID du candidat introuvable en base'}), 404

            # 2. Construire le chemin du fichier JSON dans Supabase Storage
            # Structure : candidates/{categorie_profil}/{id}/talentcard_{uuid}.json
            minio_prefix = get_candidate_minio_prefix(int(db_candidate_id))
            object_name = f"{minio_prefix}talentcard_{candidate_uuid}.json"

            print(f"🎯 Cible Supabase Storage identifiée : {object_name}")

            # 3. Récupérer le contenu du fichier JSON depuis Supabase Storage
            from supabase_storage import get_supabase_storage
            supabase_storage = get_supabase_storage()

            talentcard_data = None
            try:
                success_tc, file_bytes_tc, err_tc = supabase_storage.download_file(object_name)
                if not success_tc or not file_bytes_tc:
                    raise RuntimeError(err_tc or "Téléchargement Supabase échoué")
                talentcard_data = json.loads(file_bytes_tc.decode("utf-8"))
                print("✅ JSON TalentCard chargé avec succès depuis Supabase Storage.")
            except Exception as e:
                print(f"❌ Erreur lors de la récupération TalentCard dans Supabase Storage : {e}")
                return jsonify({
                    'success': False, 
                    'message': f"Impossible de lire le fichier JSON : {object_name}"
                }), 404

            # 3b. Récupérer les réponses du chatbot pour enrichir le scoring
            # - chat_soft_skills_text: réponse dédiée soft skills (si présente)
            # - chat_context_text: bloc Q/A complet (toutes les réponses)
            chat_soft_skills_text = None
            chat_context_text = None
            try:
                from B2.chat.save_responses import get_chat_responses_from_minio
                success, chat_data, _ = get_chat_responses_from_minio(int(db_candidate_id))
                if success and isinstance(chat_data, dict):
                    answers = chat_data.get("answers") or {}
                    if not isinstance(answers, dict):
                        answers = {}
                    questions = chat_data.get("questions") or []
                    if not isinstance(questions, list):
                        questions = []

                    # Construire un bloc Q/R compact à inclure dans le prompt A2
                    q_text_by_id = {}
                    for q in questions:
                        if not isinstance(q, dict):
                            continue
                        qid = q.get("id") or q.get("question_id")
                        qtext = q.get("question") or q.get("text") or q.get("label")
                        if qid and qtext:
                            q_text_by_id[str(qid)] = str(qtext)

                    qa_lines = []
                    for k, v in (answers or {}).items():
                        if v is None:
                            continue
                        ans = v.strip() if isinstance(v, str) else str(v).strip()
                        if not ans:
                            continue
                        qtext = q_text_by_id.get(str(k))
                        if qtext:
                            qa_lines.append(f"Q({k}): {qtext}\nA: {ans}")
                        else:
                            qa_lines.append(f"Q({k})\nA: {ans}")

                    if qa_lines:
                        joined = "\n\n".join(qa_lines)
                        # Limiter la taille du prompt
                        chat_context_text = joined[:12000]

                    # Clé attendue (question soft skills en dernier)
                    chat_soft_skills_text = (answers.get("soft_skills_8_examples") or "").strip()
                    if not chat_soft_skills_text:
                        # Fallback: toute clé contenant "soft_skills"
                        for k, v in (answers or {}).items():
                            if v and isinstance(v, str) and "soft_skills" in (k or "").lower():
                                chat_soft_skills_text = v.strip()
                                break
                    if not chat_soft_skills_text and answers:
                        # Fallback: dernière réponse = question soft skills (toujours en dernier dans le flux)
                        last_key = list(answers.keys())[-1]
                        chat_soft_skills_text = (answers.get(last_key) or "").strip()
                    if chat_soft_skills_text:
                        print("✅ Soft skills du chatbot (réponse candidat) récupérés pour l'évaluation A2.")
                    else:
                        print("⚠️ Aucune réponse soft skills trouvée dans chat_responses (scoring sans soft skills chatbot).")
                        chat_soft_skills_text = None
                    if chat_context_text:
                        print("✅ Réponses complètes du chatbot récupérées pour enrichir le scoring A2.")
                    else:
                        print("⚠️ Aucune réponse chatbot exploitable pour enrichir le scoring A2.")
            except Exception as e:
                print(f"⚠️ Chat responses non disponibles (scoring sans soft skills chatbot): {e}")
                chat_soft_skills_text = None
                chat_context_text = None

            # 4. Lancer l'Agent Scoring V2 (persistance score/skills dans Supabase)
            try:
                # Initialisation de l'agent V2
                agent = AgentScoringV2(None)

                # Exécution de l'analyse (avec soft skills chatbot si présents)
                print("🚀 Lancement de l'agent AI V2...")
                analyse = agent.evaluate_candidate(
                    talentcard_data,
                    db_candidate_id,
                    chat_soft_skills_text=chat_soft_skills_text,
                    chat_context_text=chat_context_text,
                )

                # Mini-agent compétences (A2 bis)
                agent2 = A2BisDynamicAgent()
                data_process = {
                    'skills': talentcard_data.get('skills', []),
                    'experience': talentcard_data.get('experience', []),
                    'realisations': talentcard_data.get('realisations', []),
                    'scores': analyse.get('scores', {})
                }
                skills_result = agent2.process_competencies(data_process)
                skills_payload = _extract_skills_payload(skills_result)
                analyse['skills'] = skills_payload

                score_id = analyse.get('metadata', {}).get('score_id')

                # Persistance des skills_score uniquement dans Supabase
                if supabase_db is not None and skills_payload:
                    try:
                        supabase_rows = []
                        for skill in skills_payload:
                            sup_row = {
                                "name": str(skill.get("name") or ""),
                                "score": float(skill.get("score") or 0.0),
                                "status": str(skill.get("status") or "declare"),
                                "scope": str(skill.get("scope") or "individuel"),
                                "candidate_id": db_candidate_id,
                            }
                            if score_id is not None:
                                sup_row["score_id"] = score_id
                            supabase_rows.append(sup_row)

                        if supabase_rows:
                            supabase_db.table("skills_score").upsert(
                                supabase_rows,
                                on_conflict="candidate_id,score_id,name",
                            ).execute()
                            print(
                                f"✅ {len(supabase_rows)} skills_score synchronisées dans Supabase "
                                f"(candidate_id={db_candidate_id}, score_id={score_id})"
                            )
                    except Exception as e:
                        print(f"⚠️  Erreur synchro skills_score dans Supabase: {e}")

                # Sauvegarde de l'analyse A2 uniquement dans Supabase Storage
                try:
                    if supabase_storage and supabase_storage.client:
                        minio_prefix = get_candidate_minio_prefix(db_candidate_id)
                        object_name = f"{minio_prefix}a2_analyse.json"
                        analyse_bytes = json.dumps(analyse, ensure_ascii=False).encode("utf-8")

                        sup_success, sup_url, sup_error = supabase_storage.upload_file(
                            analyse_bytes,
                            object_name,
                            content_type="application/json; charset=utf-8"
                        )
                        if sup_success:
                            print(f"✅ Analyse A2 uploadée vers Supabase Storage: {object_name}")
                        else:
                            print(f"⚠️ Échec upload analyse A2 vers Supabase Storage ({object_name}): {sup_error}")
                    else:
                        print("⚠️ Supabase Storage non initialisé, analyse A2 non sauvegardée")
                except Exception as storage_e:
                    print(f"⚠️ Erreur lors de la sauvegarde de l'analyse A2 dans Supabase Storage: {storage_e}")

                # La page frontend ne lit que le champ "success" sur le POST,
                # puis recharge les données complètes via un GET séparé.
                # On renvoie donc une réponse minimale et robuste.

                return jsonify({
                    'success': True,
                    'message': 'Analyse générée avec succès'
                })
            except Exception as agent_error:
                print(f"❌ Erreur interne de l'agent : {agent_error}")
                import traceback
                traceback.print_exc()
                return jsonify({'success': False, 'message': str(agent_error)}), 500

        else:  # GET request
            if supabase_db is None:
                return jsonify({'success': False, 'message': 'Supabase DB non configurée'}), 503

            # Lecture des données de scoring et du candidat depuis Supabase
            try:
                # Dernier score pour le candidat dans Supabase
                resp_score = (
                    supabase_db.table("score")
                    .select("*")
                    .eq("candidate_id", db_candidate_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                rows_score = resp_score.data or []
                score_data = rows_score[0] if rows_score else None

                # Infos candidat
                resp_cand = (
                    supabase_db.table("candidates")
                    .select("nom, prenom, email, phone, ville")
                    .eq("id", db_candidate_id)
                    .limit(1)
                    .execute()
                )
                rows_cand = resp_cand.data or []
                candidate_info = rows_cand[0] if rows_cand else None
            except Exception as e:
                # Gestion des erreurs réseau/HTTP (ex: httpx.RemoteProtocolError, Server disconnected, etc.)
                print(f"❌ Erreur lors de la récupération du score ou du candidat depuis Supabase: {e}")
                import traceback
                traceback.print_exc()
                return jsonify({
                    'success': False,
                    'message': "Impossible de récupérer les données de scoring depuis Supabase (problème de connexion). "
                               "Merci de réessayer dans quelques instants."
                }), 503

            # skills_score depuis Supabase
            skills_data = []
            try:
                # Votre table Supabase skills_score ne contient pas forcément score_id,
                # on se base donc uniquement sur candidate_id pour la lecture.
                resp_skills = (
                    supabase_db.table("skills_score")
                    .select("name, score, status, scope, candidate_id")
                    .eq("candidate_id", db_candidate_id)
                    .order("score", desc=True)
                    .execute()
                )
                skills_rows = resp_skills.data or []
                skills_data = [
                    {
                        "name": r.get("name"),
                        "score": _safe_float(r.get("score")),
                        "status": r.get("status") or "declare",
                        "scope": r.get("scope") or "individuel",
                    }
                    for r in skills_rows
                ]
            except Exception as e:
                print(f"⚠️ Erreur récupération skills_score depuis Supabase: {e}")

            evaluation_soft_skills_declares = []
            cached_analyse = None
            try:
                from supabase_storage import get_supabase_storage

                supabase_storage = get_supabase_storage()
                if supabase_storage and supabase_storage.client:
                    minio_prefix = get_candidate_minio_prefix(db_candidate_id)
                    object_name = f"{minio_prefix}a2_analyse.json"
                    success_cache, file_bytes_cache, error_cache = supabase_storage.download_file(object_name)
                    if success_cache and file_bytes_cache:
                        cached_analyse = json.loads(file_bytes_cache.decode("utf-8"))
                    else:
                        if error_cache:
                            print(f"⚠️ Impossible de relire l'analyse A2 depuis Supabase Storage ({object_name}): {error_cache}")
                else:
                    print("⚠️ Supabase Storage non initialisé, impossible de relire l'analyse A2")
            except Exception as cache_error:
                print(f"⚠️ Erreur lors de la récupération de l'analyse A2 depuis Supabase Storage: {cache_error}")

            if cached_analyse:
                if not skills_data:
                    skills_data = _extract_skills_payload(cached_analyse)
                ev = cached_analyse.get("evaluation_soft_skills_declares")
                if isinstance(ev, list):
                    evaluation_soft_skills_declares = ev

            if not score_data:
                return jsonify({'success': False, 'message': 'Analyse non trouvée.'}), 404

            def _score_val(*keys):
                for key in keys:
                    value = score_data.get(key)
                    if value is not None:
                        try:
                            return float(value)
                        except (TypeError, ValueError):
                            pass
                return 0.0

            # Normaliser le timestamp pour accepter à la fois datetime et chaîne
            created_at = score_data.get('created_at')
            if hasattr(created_at, "isoformat"):
                ts_value = created_at.isoformat()
            elif created_at is not None:
                ts_value = str(created_at)
            else:
                ts_value = None

            analyse = {
                'metadata': {
                    'candidate_id': db_candidate_id,
                    'timestamp': ts_value,
                    'sector_detected': score_data.get('sector_detected'),
                    'module_used': score_data.get('module_used'),
                    # Dans le schéma simplifié, on ne dépend plus de score_family_projection.
                    # On réutilise sector_detected comme proxy de famille_dominante.
                    'famille_dominante': score_data.get('sector_detected')
                },
                'scores': {
                    'score_global': float(score_data.get('score_global') or 0),
                    'famille_dominante': score_data.get('sector_detected'),
                    'dimensions': {
                        'hard_skills_fit': {
                            'score': _score_val('dim_hard_skills_depth', 'hard_skills_fit'),
                            'poids': 25,
                            'sous_scores': {
                                'nombre_competences': score_data.get('hsf_nombre_competences'),
                                'competences_core_maitrisees': score_data.get('hsf_competences_core_maitrisees'),
                                'coefficients_moyens': float(score_data.get('hsf_coefficients_moyens') or 0)
                            }
                        },
                        'preuves_impact': {
                            'score': _score_val('dim_impact', 'preuves_impact'),
                            'poids': 25,
                            'sous_scores': {
                                'qualite_metriques': float(score_data.get('impact_qualite_metriques') or 0),
                                'quantite_preuves': float(score_data.get('impact_quantite_preuves') or 0),
                                'pertinence_business': float(score_data.get('impact_pertinence_business') or 0)
                            }
                        },
                        'rarete_marche': {
                            'score': _score_val('dim_rarete_marche', 'rarete_marche'),
                            'poids': 20
                        },
                        'coherence_parcours': {
                            'score': _score_val('dim_coherence', 'coherence_parcours'),
                            'poids': 15
                        },
                        'stabilite_risque': {
                            'score': _score_val('dim_stabilite', 'stabilite_risque'),
                            'poids': 10
                        },
                        'communication_clarte': {
                            'score': _score_val('dim_communication', 'communication_clarte'),
                            'poids': 5
                        }
                    }
                },
                'commentaire_recruteur': "Analyse générée avec succès. Consultez les scores ci-dessus.",
                'questions_entretien': [],
                'decision': score_data.get('decision'),
                'skills': skills_data,
                'evaluation_soft_skills_declares': evaluation_soft_skills_declares
            }

            # Si l'analyse n'existe pas encore dans Supabase Storage, on la (re)sauvegarde ici pour les prochains appels
            try:
                from supabase_storage import get_supabase_storage

                supabase_storage = get_supabase_storage()
                if supabase_storage and supabase_storage.client:
                    minio_prefix = get_candidate_minio_prefix(db_candidate_id)
                    object_name = f"{minio_prefix}a2_analyse.json"
                    analyse_bytes = json.dumps(analyse, ensure_ascii=False).encode("utf-8")

                    sup_success, sup_url, sup_error = supabase_storage.upload_file(
                        analyse_bytes,
                        object_name,
                        content_type="application/json; charset=utf-8"
                    )
                    if sup_success:
                        print(f"✅ Analyse A2 (GET) sauvegardée dans Supabase Storage: {object_name}")
                    else:
                        print(f"⚠️ Échec upload analyse A2 (GET) vers Supabase Storage ({object_name}): {sup_error}")
                else:
                    print("⚠️ Supabase Storage non initialisé, analyse A2 (GET) non sauvegardée")
            except Exception as storage_e:
                print(f"⚠️ Erreur lors de la sauvegarde de l'analyse A2 (GET) dans Supabase Storage: {storage_e}")

            # Récupérer les soft skills déclarés par le candidat (chatbot) pour affichage
            try:
                from B2.chat.save_responses import get_chat_responses_from_minio
                success, chat_data, _ = get_chat_responses_from_minio(int(db_candidate_id))
                soft_skills_text = None
                if success and isinstance(chat_data, dict):
                    answers = chat_data.get("answers") or {}
                    if isinstance(answers, dict):
                        soft_skills_text = (answers.get("soft_skills_8_examples") or "").strip()
                        if not soft_skills_text:
                            for k, v in answers.items():
                                if v and isinstance(v, str) and "soft_skills" in (k or "").lower():
                                    soft_skills_text = v.strip()
                                    break
                        if not soft_skills_text and answers:
                            last_key = list(answers.keys())[-1]
                            soft_skills_text = (answers.get(last_key) or "").strip()
                analyse['soft_skills_declared'] = soft_skills_text or None

                # Fallback : si on a le texte mais pas d'évaluation LLM, extraire les noms des soft skills pour l'affichage
                if (soft_skills_text and (not evaluation_soft_skills_declares or len(evaluation_soft_skills_declares) == 0)):
                    import re
                    parsed = []
                    seen = set()
                    for line in soft_skills_text.split('\n'):
                        line = line.strip()
                        if not line or ':' not in line:
                            continue
                        # Partie avant le premier ":" = libellé (ex: "**Autonomie**" ou "**Pensée Analytique (Analytical Thinking)**")
                        raw_nom = line.split(':', 1)[0].strip()
                        nom = re.sub(r'^\*+|\*+$', '', raw_nom).strip()
                        # Garder uniquement les libellés courts (titres de soft skill), pas une phrase
                        if 2 < len(nom) <= 100 and nom.lower() not in seen:
                            seen.add(nom.lower())
                            parsed.append({'nom': nom, 'niveau': 'MOYEN'})
                    if parsed:
                        evaluation_soft_skills_declares = parsed
                        analyse['evaluation_soft_skills_declares'] = parsed
            except Exception:
                analyse['soft_skills_declared'] = None

            return jsonify({
                'success': True,
                'analyse': analyse,
                'candidate_info': candidate_info
            })

    except Exception as e:
        print(f"❌ Erreur dans le scoring_candidate endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == "__main__":

    app.run(host="0.0.0.0", port=5002, debug=True, use_reloader=False)
