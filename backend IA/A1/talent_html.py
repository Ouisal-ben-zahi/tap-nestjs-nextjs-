"""
Agent de génération de portfolios HTML
Génère automatiquement les versions HTML (longue et one-page) à partir des données JSON du portfolio
"""

import base64
import os
import random
import re
import tempfile
import threading
from typing import Any, Dict, List, Optional, Tuple
from jinja2 import Template

from supabase_db import supabase_db
from supabase_storage import get_supabase_storage
from candidate_minio_path import get_candidate_minio_prefix
import json

# Talent Card : template officiel (frontend/src/templates_modif/). Ne pas réutiliser
# talent_card_template.html / talent_card_template2.html pour la génération HTML/PDF.
TALENT_CARD_TEMPLATE_FILE = "Talent_card_dynamic.html"


def _load_talentcard_from_db(candidate_id: int) -> Optional[Dict[str, Any]]:
    """
    Charge la Talent Card à partir de Supabase (table candidates),
    puis tente de la compléter avec le JSON Talent Card généré par A1
    stocké dans Supabase Storage (même logique que dans backend/app.py).
    """

    if supabase_db is None:
        print("⚠️ Supabase DB non configuré pour _load_talentcard_from_db (A1)")
        return None

    try:
        # 1) Charger la ligne candidate depuis Supabase
        resp = (
            supabase_db.table("candidates")
            .select("*")
            .eq("id", candidate_id)
            .limit(1)
            .execute()
        )
        candidate = resp.data[0] if resp.data else None
        if not candidate:
            return None

        # Normalisation du type de contrat (même logique que côté app.py)
        raw_type = candidate.get("type_contrat")
        type_contrat_list = []
        if raw_type is not None:
            if isinstance(raw_type, (list, tuple)):
                type_contrat_list = [str(v).strip() for v in raw_type if v and str(v).strip()]
            else:
                if not isinstance(raw_type, str):
                    raw_type = str(raw_type)
                raw_type = raw_type.strip()
                if raw_type:
                    if raw_type.lstrip().startswith("["):
                        try:
                            parsed = json.loads(raw_type)
                            if isinstance(parsed, list):
                                type_contrat_list = [str(v).strip() for v in parsed if v and str(v).strip()]
                        except Exception as parse_err:
                            print(f"⚠️  Erreur parsing JSON type_contrat pour candidate_id={candidate_id}: {parse_err}")
                    if not type_contrat_list:
                        type_contrat_list = [part.strip() for part in raw_type.split(",") if part and part.strip()]

        # Données de base depuis la table candidates
        talentcard_data: Dict[str, Any] = {
            "id_agent": candidate.get("id_agent"),
            "nom": candidate.get("nom") or "",
            "prenom": candidate.get("prenom") or "",
            "Titre de profil": candidate.get("titre_profil") or "",
            "ville": candidate.get("ville") or "",
            "pays": candidate.get("pays") or "",
            "linkedin": candidate.get("linkedin") or "",
            "github": candidate.get("github") or "",
            "behance": candidate.get("behance") or "",
            "email": candidate.get("email") or "",
            "phone": candidate.get("phone") or "",
            "annees_experience": candidate.get("annees_experience"),
            "disponibilite": candidate.get("disponibilite") or "",
            "pret_a_relocater": candidate.get("pret_a_relocater") or "",
            "niveau_seniorite": candidate.get("niveau_seniorite") or "",
            "pays_cible": (candidate.get("pays_cible") or candidate.get("target_country") or "").strip() or "",
            "salaire_minimum": candidate.get("salaire_minimum") or "",
            "resume_bref": candidate.get("resume_bref") or "",
            # Champs principalement fournis par le JSON Talent Card d'A1 (stockage fichiers)
            "skills": [],
            "experience": [],
            "realisations": [],
            "langues_parlees": [],
            "type_contrat": type_contrat_list,
            "analyse": candidate.get("analyse") or "",
            "categorie_profil": (candidate.get("categorie_profil") or "").strip() or "",
            "soft_skills": candidate.get("soft_skills"),
        }

        # 2) Compléter avec le JSON Talent Card généré par A1 stocké dans Supabase Storage
        try:
            storage = get_supabase_storage()
            if storage and storage.client:
                prefix = get_candidate_minio_prefix(candidate_id) + "talentcard_"
                folder = prefix.rsplit("talentcard_", 1)[0].rstrip("/")
                existing_names = set()
                try:
                    listed = storage.list_files(folder)
                    for item in listed:
                        name = item.get("name", "") if isinstance(item, dict) else str(item)
                        if name:
                            existing_names.add(name)
                except Exception as e_list:
                    print(f"⚠️  Listage Supabase Storage échoué pour Talent Card: {e_list}")

                # Priorité au nom standard actuel, puis anciens noms
                candidate_names = ["talentcard_TAP.json"]
                try:
                    fv_resp = (
                        supabase_db.table("fichiers_versions")
                        .select("candidate_uuid")
                        .eq("candidate_id", candidate_id)
                        .order("id", desc=True)
                        .limit(1)
                        .execute()
                    )
                    if fv_resp.data:
                        cand_uuid = fv_resp.data[0].get("candidate_uuid")
                        if cand_uuid:
                            candidate_names.append(f"talentcard_{cand_uuid}.json")
                except Exception as e_fv:
                    print(f"⚠️  Lookup fichiers_versions pour talentcard JSON (Supabase) échoué: {e_fv}")
                candidate_names.append("talentcard_latest.json")

                selected_name = next((n for n in candidate_names if n in existing_names), None)
                if selected_name:
                    tc_object_name = f"{folder}/{selected_name}"
                    success, file_bytes, _error = storage.download_file(tc_object_name)
                    if success and file_bytes:
                        tc_json = json.loads(file_bytes.decode("utf-8"))
                        if isinstance(tc_json, dict):
                            merged = dict(talentcard_data)
                            # Le JSON A1 contient notamment skills, experience, realisations, langues_parlees...
                            for k, v in tc_json.items():
                                merged[k] = v
                            talentcard_data = merged
        except Exception as e_storage:
            print(f"⚠️  Impossible de compléter la Talent Card depuis Supabase Storage pour candidat {candidate_id}: {e_storage}")

        return talentcard_data
    except Exception as e:
        print(f"❌ Erreur chargement talentcard depuis Supabase: {e}")
        return None


def _parse_skills_raw(raw: Any) -> list:
    """skills en base / JSON A1 : souvent liste de chaînes, parfois JSON string ou dicts."""
    if raw is None:
        return []
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return []
        if s.startswith("["):
            try:
                parsed = json.loads(s)
                return parsed if isinstance(parsed, list) else [parsed]
            except Exception:
                return [p.strip() for p in s.split(",") if p.strip()]
        return [p.strip() for p in s.split(",") if p and p.strip()]
    if isinstance(raw, list):
        return raw
    return []


def _skill_label(item: Any) -> str:
    if isinstance(item, dict):
        return str(
            item.get("name")
            or item.get("skill")
            or item.get("label")
            or item.get("nom")
            or ""
        ).strip()
    return str(item).strip() if item else ""


def _skill_score_from_item(item: Any) -> Optional[float]:
    if not isinstance(item, dict):
        return None
    for k in ("score", "percentage", "value", "niveau", "level"):
        v = item.get(k)
        if v is None:
            continue
        try:
            x = float(str(v).replace("%", "").replace(",", ".").strip())
            return max(0.0, min(100.0, x))
        except (TypeError, ValueError):
            continue
    return None


def _fetch_skills_score_map(db_candidate_id: int) -> dict[str, float]:
    """name normalisé -> score (0–100) depuis skills_score (A2)."""
    if supabase_db is None:
        return {}
    try:
        resp = (
            supabase_db.table("skills_score")
            .select("name, score")
            .eq("candidate_id", db_candidate_id)
            .order("score", desc=True)
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        print(f"⚠️ skills_score Talent Card non chargé: {e}")
        return {}
    out: dict[str, float] = {}
    for r in rows:
        nm = (r.get("name") or "").strip()
        if not nm:
            continue
        key = re.sub(r"\s+", " ", nm.lower())
        try:
            sc = float(r.get("score") or 0)
        except (TypeError, ValueError):
            sc = 0.0
        out[key] = max(0.0, min(100.0, sc))
    return out


def enrich_hard_skills_with_percentages(db_candidate_id: int, raw_skills: Any) -> List[Dict[str, Any]]:
    """
    A1 renvoie souvent skills = ["Analyse", "ML", ...] sans pourcentage → barres à 0 % dans le template.
    On aligne sur skills_score (A2) par nom, sinon pourcentages de repli déterministes.
    """
    items = _parse_skills_raw(raw_skills)
    if not items:
        return []

    a2_map = _fetch_skills_score_map(db_candidate_id)
    fallback_ring = [76, 71, 66, 61, 56, 51, 58, 63]

    def _norm_key(s: str) -> str:
        return re.sub(r"\s+", " ", (s or "").lower().strip())

    result: list[dict[str, Any]] = []
    for i, item in enumerate(items[:8]):
        name = _skill_label(item)
        if not name:
            continue
        explicit = _skill_score_from_item(item)
        if explicit is not None:
            result.append({"name": name, "score": explicit})
            continue

        nk = _norm_key(name)
        pct: Optional[float] = None
        if nk in a2_map:
            pct = a2_map[nk]
        else:
            for k2, sc in a2_map.items():
                if nk in k2 or k2 in nk:
                    pct = sc
                    break
        if pct is None:
            pct = float(fallback_ring[i % len(fallback_ring)])
        result.append({"name": name, "score": pct})

    return result


def _normalize_soft_skills_for_template(raw: Any) -> list:
    """Normalise soft_skills (JSON, liste, CSV) pour Talent_card_dynamic.html."""
    if raw is None:
        return []
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return []
        if s.startswith("["):
            try:
                return _normalize_soft_skills_for_template(json.loads(s))
            except Exception:
                pass
        return [p.strip() for p in s.split(",") if p.strip()]
    if isinstance(raw, list):
        return raw
    return []


def transform_talent_card_data_for_template(
    talent_card_data: Dict,
    candidate_image_url: Optional[str] = None,
    candidate_job_title: Optional[str] = None,
    candidate_years_experience: Optional[int] = None,
    candidate_email: Optional[str] = None,
    candidate_phone: Optional[str] = None,
) -> Dict:
    """
    Transforme les données talent card (DB ou JSON) en format attendu par le template Jinja2.
    """
    c = talent_card_data

    # Normaliser les langues en liste de chaînes affichables pour le template.
    raw_languages = (
        c.get("langues_parlees")
        or c.get("languages")
        or c.get("langues")
        or []
    )
    if isinstance(raw_languages, str):
        stripped = raw_languages.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            try:
                parsed_lang = json.loads(stripped)
                raw_languages = parsed_lang if isinstance(parsed_lang, list) else [stripped]
            except Exception:
                raw_languages = [x.strip() for x in stripped.split(",") if x and x.strip()]
        else:
            raw_languages = [x.strip() for x in stripped.split(",") if x and x.strip()]

    normalized_languages = []
    for item in (raw_languages if isinstance(raw_languages, list) else []):
        if isinstance(item, dict):
            name = (
                item.get("langue")
                or item.get("nom")
                or item.get("name")
                or item.get("language")
                or ""
            )
            level = item.get("niveau") or item.get("level") or ""
            label = f"{str(name).strip()}: {str(level).strip()}".strip(": ").strip()
            if label:
                normalized_languages.append(label)
        else:
            label = str(item).strip()
            if label:
                normalized_languages.append(label)

    candidate = {
        "nom": c.get("nom", "") or "",
        "prenom": c.get("prenom", "") or "",
        "Titre de profil": c.get("Titre de profil", "") or c.get("titre_profil", "") or "",
        "titre_profil": c.get("Titre de profil", "") or c.get("titre_profil", "") or "",
        "ville": c.get("ville", "") or "",
        "pays": c.get("pays", "") or "",
        "email": (candidate_email or c.get("email", "") or "").strip(),
        "phone": (candidate_phone or c.get("phone", "") or "").strip(),
        "annees_experience": candidate_years_experience if candidate_years_experience is not None else c.get("annees_experience"),
        "disponibilite": c.get("disponibilite", "") or "",
        "type_contrat": c.get("type_contrat") if isinstance(c.get("type_contrat"), list) else ([c.get("type_contrat")] if c.get("type_contrat") else []),
        "skills": c.get("skills") or [],
        "profile_image_url": candidate_image_url or "",
        "qr_code_url": "",  # Sera rempli dans generate_talent_card_html si cv_download_url disponible
        "linkedin_url": (c.get("linkedin") or "").strip() or "",
        "github_url": (c.get("github") or "").strip() or "",
        "behance_url": (c.get("behance") or "").strip() or "",
        "cv_download_url": "",  # Sera rempli dans generate_talent_card_html
        "pret_a_relocater": (c.get("pret_a_relocater") or c.get("prêt à relocaliser") or c.get("ready_to_relocate") or "").strip() or "",
        "niveau_seniorite": (c.get("niveau_seniorite") or c.get("niveau de seniorite") or "").strip() or "",
        "pays_cible": (c.get("pays_cible") or c.get("target_country") or c.get("pays cible") or "").strip() or "",
        "salaire_minimum": (c.get("salaire_minimum") or "").strip() or "",
        "langues_parlees": normalized_languages,
        "categorie_profil": (c.get("categorie_profil") or "").strip() or "",
        "soft_skills": _normalize_soft_skills_for_template(c.get("soft_skills")),
        "logo_url": (c.get("logo_url") or "").strip() or "",
    }
    return {"candidate": candidate}


def _minio_url_to_proxy(url: Optional[str], flask_base_url: str = "http://localhost:5002") -> str:
    """
    Compat utilitaire historique.

    Anciennement, on convertissait une URL MinIO vers une route proxy Flask.
    Désormais, si l'on reçoit un chemin de stockage (ex: 'candidates/.../image.jpg'),
    on génère une URL signée Supabase Storage pour que le template puisse l'afficher.
    Si l'on reçoit déjà une vraie URL HTTP, on la renvoie telle quelle.
    """
    if not url:
        return ""

    url = (url or "").strip()
    # Si c'est déjà une URL complète, on la laisse telle quelle.
    if url.startswith("http://") or url.startswith("https://"):
        return url

    # Sinon, on considère que c'est un chemin de fichier dans Supabase Storage
    try:
        storage = get_supabase_storage()
        if storage and storage.client:
            signed = storage.get_file_url(url)
            if signed:
                return signed
    except Exception as e:
        print(f"⚠️ Impossible de générer une URL Supabase pour l'image Talent Card '{url}': {e}")

    # Fallback: renvoyer le chemin brut
    return url


def get_template_path(template_name: str) -> Optional[str]:
    """
    Trouve le chemin du template HTML.
    
    Args:
        template_name: Nom du fichier (ex: Talent_card_dynamic.html)
    
    Returns:
        Chemin absolu du template ou None si introuvable
    """
    _proj_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # Priorité à templates_modif (Talent Card actuelle), puis anciens dossiers (fallback).
    possible_paths = [
        os.path.join(_proj_root, "frontend", "src", "templates_modif", template_name),
        f"/app/frontend/src/templates_modif/{template_name}",
        f"/frontend/src/templates_modif/{template_name}",
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "templates_modif", template_name),
        os.path.join(_proj_root, "frontend", "src", "20260312_044613", template_name),
        os.path.join(_proj_root, "frontend", "src", "talent card html", template_name),
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "..",
            "frontend",
            "src",
            "20260312_044613",
            template_name,
        ),
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "..",
            "frontend",
            "src",
            "talent card html",
            template_name,
        ),
        "/app/frontend/src/20260312_044613/" + template_name,
        "/frontend/src/20260312_044613/" + template_name,
        os.path.join(os.getcwd(), "frontend", "src", "20260312_044613", template_name),
        "/app/frontend/src/talent card html/" + template_name,
        "/frontend/src/talent card html/" + template_name,
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None


def convert_project_images_to_proxy(projects: list, flask_base_url: str = "http://localhost:5002") -> list:
    """
    Compat utilitaire pour les images de projets.
    Avec Supabase Storage, les URLs générées sont déjà accessibles publiquement ou via URL signée,
    donc on renvoie la structure telle quelle.
    """
    return projects


def generate_talent_card_html(
    candidate_id: int,
    candidate_image_url: Optional[str] = None,
    candidate_email: Optional[str] = None,
    candidate_phone: Optional[str] = None,
    candidate_job_title: Optional[str] = None,
    candidate_years_experience: Optional[int] = None,
    flask_base_url: str = "http://localhost:5002",
    candidate_uuid: Optional[str] = None,
    candidate_linkedin_url: Optional[str] = None,
    candidate_github_url: Optional[str] = None,
    candidate_behance_url: Optional[str] = None,
    lang: str = "fr",
    extra_candidate_data: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Génère le HTML de la Talent Card à partir des données du candidat.
    
    Args:
        candidate_id: ID du candidat en base de données
        candidate_image_url: URL de l'image du candidat (optionnel)
        candidate_email: Email du candidat (optionnel)
        candidate_phone: Téléphone du candidat (optionnel)
        candidate_job_title: Titre du poste (optionnel)
        candidate_years_experience: Années d'expérience (optionnel)
        flask_base_url: URL de base du serveur Flask pour les proxies
        candidate_uuid: UUID du candidat pour le lien de téléchargement du CV (optionnel)
    
    Returns:
        Tuple (success, html_content, error_message)
    """
    try:
        print(f"🔄 Génération de la Talent Card HTML pour candidate_id={candidate_id}")

        # 1. Charger les données talent card depuis la base
        talent_card_data = _load_talentcard_from_db(candidate_id)
        if not talent_card_data:
            return False, None, "Données talent card introuvables pour ce candidat (base de données)"

        print("✅ Données Talent Card chargées depuis la base")
        
        # Photo candidat : convertir URL MinIO en proxy pour affichage dans le HTML
        profile_image_url = _minio_url_to_proxy(candidate_image_url, flask_base_url) if candidate_image_url else ""

        # 2. Transformer les données pour le template (Talent_card_dynamic.html)
        template_data = transform_talent_card_data_for_template(
            talent_card_data,
            candidate_image_url=profile_image_url,
            candidate_job_title=candidate_job_title,
            candidate_years_experience=candidate_years_experience,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
        )

        # 2.0 Hard skills : A1 = noms sans % → enrichir (skills_score A2 ou pourcentages de repli)
        if template_data.get("candidate"):
            template_data["candidate"]["skills"] = enrich_hard_skills_with_percentages(
                candidate_id,
                template_data["candidate"].get("skills"),
            )

        # 2.1 Lien de téléchargement du CV (pour le template) et QR code pointant vers la page recruteur (valide dès le début)
        cv_download_url = ""
        if candidate_uuid:
            cv_download_url = (
                f"{flask_base_url.rstrip('/')}/correctedcv/{candidate_uuid}/download?db_candidate_id={candidate_id}"
            )
        recruit_landing_url = f"{flask_base_url.rstrip('/')}/recruit/{candidate_id}"
        if template_data.get("candidate"):
            template_data["candidate"]["cv_download_url"] = cv_download_url
            # QR code : pointe vers la page recruteur (tous les fichiers) pour être valide dès la génération de la talent card
            try:
                from A1.generate_talent import _make_qr_image_bytes
                qr_bytes = _make_qr_image_bytes(recruit_landing_url, box_size=4)
                if qr_bytes:
                    template_data["candidate"]["qr_code_url"] = (
                        "data:image/png;base64," + base64.b64encode(qr_bytes).decode("ascii")
                    )
                else:
                    template_data["candidate"]["qr_code_url"] = ""
            except Exception as e:
                print(f"⚠️ QR code non généré: {e}")
                template_data["candidate"]["qr_code_url"] = ""

        # 2.2 LinkedIn / GitHub / Behance depuis la base ou formulaire (priorité sur les données générées)
        if template_data.get("candidate"):
            if candidate_linkedin_url:
                template_data["candidate"]["linkedin_url"] = candidate_linkedin_url.strip()
            if candidate_github_url:
                template_data["candidate"]["github_url"] = candidate_github_url.strip()
            if candidate_behance_url:
                template_data["candidate"]["behance_url"] = candidate_behance_url.strip()

        # 2.3 Score global (A2) pour le pied de carte — avant extra_candidate_data pour permettre override
        if template_data.get("candidate") and supabase_db is not None:
            try:
                sc = (
                    supabase_db.table("score")
                    .select("score_global")
                    .eq("candidate_id", candidate_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                rows_sc = sc.data or []
                if rows_sc and rows_sc[0].get("score_global") is not None:
                    template_data["candidate"]["score"] = float(rows_sc[0]["score_global"])
            except Exception as e_sc:
                print(f"⚠️ Score global Talent Card non chargé (non bloquant): {e_sc}")

        # 2.4 Données supplémentaires (ex: pays_cible depuis le formulaire à la création)
        if extra_candidate_data and template_data.get("candidate"):
            for key, value in extra_candidate_data.items():
                if value is not None and (value if isinstance(value, str) else str(value)).strip():
                    template_data["candidate"][key] = value
        
        print("✅ Données transformées pour le template")
        
        # 3. Template carte — TALENT_CARD_TEMPLATE_FILE uniquement
        template_name = TALENT_CARD_TEMPLATE_FILE
        
        # 4. Charger le template
        template_path = get_template_path(template_name)
        
        if not template_path:
            return False, None, f"Template introuvable: {template_name}"
        
        print(f"✅ Template trouvé: {template_path}")
        
        # 5. Lire le template
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # 6. URL de base pour les assets (images de fond) — le HTML est servi sans chemin de fichier
        assets_base_url = (flask_base_url or "http://localhost:5002").rstrip("/") + "/talent/static/"
        lang = (lang or "fr").lower() if lang else "fr"
        if lang not in ("fr", "en"):
            lang = "fr"
        # 7. Rendre le template avec Jinja2
        try:
            jinja_template = Template(template_content)
            html_content = jinja_template.render(
                candidate=template_data.get('candidate', {}),
                candidate_id=candidate_id,
                assets_base_url=assets_base_url,
                portfolio_lang=lang,
            )
            print("✅ Template rendu avec succès (talent-card)")
            return True, html_content, None
        except Exception as e:
            error_msg = f"Erreur lors du rendu Jinja2: {str(e)}"
            print(f"❌ {error_msg}")
            import traceback
            traceback.print_exc()
            return False, None, error_msg
        
    except Exception as e:
        error_msg = f"Erreur lors de la génération du portfolio HTML: {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return False, None, error_msg


def save_portfolio_html(
    html_content: str,
    candidate_id: int,
    candidate_uuid: str,
    version: str = "one-page",
    lang: Optional[str] = None,
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Sauvegarde le HTML généré dans Supabase Storage.
    
    Args:
        html_content: Contenu HTML généré
        candidate_id: ID du candidat
        candidate_uuid: UUID du candidat
        version: Version ("one-page", "long", "talent-card")
        lang: Langue ("fr" ou "en"). Si fourni, suffixe ajouté au nom du fichier.
    
    Returns:
        Tuple (success, url, error_message)
    """
    try:
        storage = get_supabase_storage()
        if not storage or not storage.client:
            return False, None, "Supabase Storage non initialisé"

        minio_prefix = get_candidate_minio_prefix(candidate_id)
        if lang and lang in ("fr", "en"):
            object_name = f"{minio_prefix}portfolio_TAP_{version}_{lang}.html"
        else:
            object_name = f"{minio_prefix}portfolio_TAP_{version}.html"

        html_bytes = html_content.encode("utf-8")
        success, url, err = storage.upload_file(
            html_bytes,
            object_name,
            content_type="text/html; charset=utf-8",
        )
        if success:
            print(f"✅ HTML sauvegardé dans Supabase Storage: {object_name}")
            return True, url, None
        return False, None, err or "Erreur upload HTML vers Supabase Storage"

    except Exception as e:
        error_msg = f"Erreur lors de la sauvegarde du portfolio HTML (Supabase): {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return False, None, error_msg


def _get_talent_card_assets_dir() -> Optional[str]:
    """Retourne le chemin du dossier des assets (Modif-2.jpeg, Background-3.png) pour la Talent Card."""
    _here = os.path.dirname(os.path.abspath(__file__))
    _backend = os.path.dirname(_here)
    _root = os.path.dirname(_backend)
    for base in [
        os.path.join(_root, "frontend", "src", "talent card html"),
        os.path.join(_backend, "..", "frontend", "src", "talent card html"),
        "/app/frontend/src/talent card html",
        "/frontend/src/talent card html",
        os.path.join(os.getcwd(), "frontend", "src", "talent card html"),
    ]:
        base = os.path.normpath(os.path.abspath(base))
        modif = os.path.join(base, "Modif-2.jpeg")
        bg3 = os.path.join(base, "Background-3.png")
        if os.path.isfile(modif) and os.path.isfile(bg3):
            return base
    return None


def convert_talent_card_html_to_pdf(
    html_content: str,
    candidate_id: int,
    candidate_uuid: str,
    lang: str = "fr",
    export_png: bool = True,
) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
    """
    Convertit le HTML de la Talent Card en PDF (Playwright), puis uploade dans Supabase Storage.
    En option, capture `.tc-card` en PNG dans la même session (HTML → image).

    PDF : dimensions = boîte exacte de `.tc-card` (pas de bande noire autour).

    Returns:
        Tuple (success, pdf_minio_url, png_minio_url_or_none, error_message)
    """
    try:
        from playwright.sync_api import sync_playwright
        import http.server
        import socketserver

        print(f"🔄 Conversion Talent Card HTML → PDF pour candidate_id={candidate_id}")

        # Intégrer les images de fond en base64 pour le PDF
        assets_dir = _get_talent_card_assets_dir()
        if assets_dir:
            try:
                with open(os.path.join(assets_dir, "Modif-2.jpeg"), "rb") as f:
                    b64_modif = base64.b64encode(f.read()).decode("ascii")
                with open(os.path.join(assets_dir, "Background-3.png"), "rb") as f:
                    b64_bg3 = base64.b64encode(f.read()).decode("ascii")
                data_modif = f"data:image/jpeg;base64,{b64_modif}"
                data_bg3 = f"data:image/png;base64,{b64_bg3}"
                html_content = re.sub(
                    r"url\s*\(\s*['\"]?[^'\"]*Modif-2\.jpeg['\"]?\s*\)",
                    f"url('{data_modif}')",
                    html_content,
                )
                html_content = re.sub(
                    r"url\s*\(\s*['\"]?[^'\"]*Background-3\.png['\"]?\s*\)",
                    f"url('{data_bg3}')",
                    html_content,
                )
                print("✅ Images de fond Talent Card intégrées en base64 pour le PDF")
            except Exception as e:
                print(f"⚠️ Images de fond Talent Card non intégrées: {e}")

        # @media print — dimensions page injectées après mesure (.tc-card) via add_style_tag
        _exact = "-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;"
        pdf_print_style = (
            " @media print { "
            " * { " + _exact + " } "
            " .tc-bar-fill { transition: none !important; } "
            " } "
        )

        html_content = html_content.replace("</style>", pdf_print_style + "\n    </style>", 1)

        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False, encoding="utf-8") as f:
            f.write(html_content)
            temp_html_path = f.name

        temp_dir = os.path.dirname(temp_html_path)
        html_filename = os.path.basename(temp_html_path)

        class _Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=temp_dir, **kwargs)

            def log_message(self, format, *args):
                pass

        class _Reusable(socketserver.TCPServer):
            allow_reuse_address = True

        httpd = None
        for _ in range(10):
            try:
                port = random.randint(8000, 9000)
                httpd = _Reusable(("", port), _Handler)
                break
            except OSError:
                continue
        if not httpd:
            raise RuntimeError("Aucun port disponible pour le serveur HTTP")

        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()

        pdf_path = None
        png_path = None
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                # Même largeur logique que la carte (~10 cm) pour un layout stable
                _card_w_px = max(320, int(round((10.0 / 2.54) * 96)))
                page.set_viewport_size({"width": _card_w_px, "height": 2000})

                page.emulate_media(media="print")

                local_url = f"http://localhost:{port}/{html_filename}"
                page.goto(local_url, wait_until="networkidle", timeout=30000)
                page.wait_for_load_state("networkidle", timeout=10000)
                page.wait_for_timeout(800)
                # Barres : ne pas dépendre du setTimeout(200) seul
                page.evaluate(
                    """() => {
                      document.querySelectorAll('.tc-bar-fill').forEach(function (el) {
                        var v = el.getAttribute('data-pct');
                        if (v != null) el.style.width = v + '%';
                      });
                    }"""
                )
                page.wait_for_timeout(400)

                dims = page.evaluate(
                    """() => {
                      var card = document.querySelector('.tc-card');
                      if (!card) return null;
                      var r = card.getBoundingClientRect();
                      return {
                        w: Math.ceil(r.width + 2),
                        h: Math.ceil(r.height + 1)
                      };
                    }"""
                )
                _w_fallback = max(320, int(round((10.0 / 2.54) * 96)))
                if isinstance(dims, dict) and dims.get("w") and dims.get("h"):
                    w_px = max(int(dims["w"]), 280)
                    h_px = max(int(dims["h"]), 400)
                else:
                    w_px = _w_fallback
                    h_px = page.evaluate(
                        """() => {
                          var card = document.querySelector('.tc-card');
                          if (card) {
                            return Math.ceil(card.getBoundingClientRect().height + 1);
                          }
                          return 600;
                        }"""
                    )
                    h_px = max(int(h_px or 0), 480)

                # Très petite marge pour éviter rognage sous-pixel (le PDF = presque uniquement la carte)
                w_cm = (float(w_px) / 96.0) * 2.54 + 0.04
                h_cm = (float(h_px) / 96.0) * 2.54 + 0.02

                page.add_style_tag(
                    content=f"""
@media print {{
  html, body {{
    width: {w_cm:.3f}cm !important;
    height: {h_cm:.3f}cm !important;
    min-width: {w_cm:.3f}cm !important;
    min-height: {h_cm:.3f}cm !important;
    max-width: {w_cm:.3f}cm !important;
    max-height: {h_cm:.3f}cm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #000 !important;
    overflow: hidden !important;
    display: block !important;
    box-sizing: border-box !important;
  }}
  .tc-card {{
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    page-break-inside: avoid !important;
  }}
  .tc-card::before,
  .tc-card::after {{
    border-radius: 0 !important;
  }}
}}
"""
                )
                page.wait_for_timeout(120)

                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as pf:
                    pdf_path = pf.name
                if export_png:
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as pnf:
                        png_path = pnf.name

                page.pdf(
                    path=pdf_path,
                    print_background=True,
                    width=f"{w_cm:.3f}cm",
                    height=f"{h_cm:.3f}cm",
                    prefer_css_page_size=False,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                )
                if export_png and png_path:
                    try:
                        loc = page.locator(".tc-card").first
                        if loc.count() > 0:
                            loc.screenshot(path=png_path, type="png")
                            print("✅ Capture PNG Talent Card (.tc-card) effectuée")
                        else:
                            print("⚠️ Élément .tc-card introuvable — PNG Talent Card ignoré")
                            try:
                                os.unlink(png_path)
                            except OSError:
                                pass
                            png_path = None
                    except Exception as png_ex:
                        print(f"⚠️ Capture PNG Talent Card échouée: {png_ex}")
                        if png_path and os.path.isfile(png_path):
                            try:
                                os.unlink(png_path)
                            except OSError:
                                pass
                        png_path = None
                browser.close()

            httpd.shutdown()
            server_thread.join(timeout=2)

            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            print(f"✅ PDF Talent Card généré: {len(pdf_bytes)} bytes")

            prefix = get_candidate_minio_prefix(candidate_id)
            # FR = nom historique (sans suffixe) pour compatibilité, EN = suffixe _en
            _lang = (lang or "fr").lower()
            if _lang == "en":
                object_name = f"{prefix}talentcard_html_TAP_en.pdf"
            else:
                object_name = f"{prefix}talentcard_html_TAP.pdf"

            storage = get_supabase_storage()
            if not storage or not storage.client:
                raise RuntimeError("Supabase Storage non initialisé pour upload Talent Card PDF")

            success, url, err = storage.upload_file(
                pdf_bytes,
                object_name,
                content_type="application/pdf",
            )
            png_url_out: Optional[str] = None
            if success and export_png and png_path and os.path.isfile(png_path):
                try:
                    with open(png_path, "rb") as png_f:
                        png_bytes = png_f.read()
                    if png_bytes:
                        png_object = (
                            f"{prefix}talentcard_html_TAP_en.png"
                            if _lang == "en"
                            else f"{prefix}talentcard_html_TAP.png"
                        )
                        ok_png, url_png, err_png = storage.upload_file(
                            png_bytes,
                            png_object,
                            content_type="image/png",
                        )
                        if ok_png:
                            png_url_out = url_png
                            print(f"✅ PNG Talent Card uploadé vers Supabase Storage: {png_object}")
                        else:
                            print(f"⚠️ Upload PNG Talent Card: {err_png}")
                except Exception as up_png:
                    print(f"⚠️ Upload PNG Talent Card: {up_png}")

            for path in (temp_html_path, pdf_path, png_path):
                if path:
                    try:
                        os.unlink(path)
                    except Exception:
                        pass
            if success:
                print(f"✅ PDF Talent Card uploadé vers Supabase Storage: {object_name}")
                return True, url, png_url_out, None
            return False, None, None, err or "Erreur upload PDF vers Supabase Storage"

        except Exception as e:
            try:
                httpd.shutdown()
                server_thread.join(timeout=1)
            except Exception:
                pass
            for path in (temp_html_path, pdf_path or "", png_path or ""):
                if path and os.path.isfile(path):
                    try:
                        os.unlink(path)
                    except Exception:
                        pass
            raise e

    except Exception as e:
        error_msg = f"Erreur conversion Talent Card HTML → PDF: {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return False, None, None, error_msg


def generate_and_save_talent_card_html(
    candidate_id: int,
    candidate_uuid: str,
    candidate_image_url: Optional[str] = None,
    candidate_email: Optional[str] = None,
    candidate_phone: Optional[str] = None,
    candidate_job_title: Optional[str] = None,
    candidate_years_experience: Optional[int] = None,
    candidate_linkedin_url: Optional[str] = None,
    candidate_github_url: Optional[str] = None,
    candidate_behance_url: Optional[str] = None,
    flask_base_url: Optional[str] = None,
    save_to_minio: bool = True,
    generate_pdf: bool = True,
    generate_png: bool = True,
    lang: str = "fr",
    extra_candidate_data: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, Optional[str], Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Génère la Talent Card HTML, la sauvegarde dans Supabase Storage, puis la convertit en PDF (+ PNG optionnel).

    Args:
        generate_pdf: Si True, PDF (+ PNG si generate_png) via Playwright
        generate_png: Si True (défaut), capture `.tc-card` en PNG lors de l’export PDF

    Returns:
        Tuple (success, html_content, html_url, pdf_url, png_url, error_message)
    """
    lang = (lang or "fr").lower() if lang else "fr"
    if lang not in ("fr", "en"):
        lang = "fr"
    success, html_content, error = generate_talent_card_html(
        candidate_id=candidate_id,
        candidate_image_url=candidate_image_url,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone,
        candidate_job_title=candidate_job_title,
        candidate_years_experience=candidate_years_experience,
        candidate_uuid=candidate_uuid,
        candidate_linkedin_url=candidate_linkedin_url,
        candidate_github_url=candidate_github_url,
        candidate_behance_url=candidate_behance_url,
        flask_base_url=flask_base_url or "http://localhost:5002",
        lang=lang,
        extra_candidate_data=extra_candidate_data,
    )
    if not success:
        return False, None, None, None, None, error

    minio_html_url = None
    if save_to_minio:
        save_ok, minio_html_url, save_err = save_portfolio_html(
            html_content,
            candidate_id,
            candidate_uuid,
            version="talent-card",
            lang=lang,
        )
        if not save_ok:
            print(f"⚠️  Erreur sauvegarde HTML Talent Card dans Supabase Storage: {save_err}")

    minio_pdf_url = None
    minio_png_url = None
    if generate_pdf and html_content:
        pdf_ok, minio_pdf_url, minio_png_url, pdf_err = convert_talent_card_html_to_pdf(
            html_content,
            candidate_id,
            candidate_uuid,
            lang=lang,
            export_png=generate_png,
        )
        if not pdf_ok:
            print(f"⚠️  Erreur conversion Talent Card HTML → PDF: {pdf_err}")

    return True, html_content, minio_html_url, minio_pdf_url, minio_png_url, None
