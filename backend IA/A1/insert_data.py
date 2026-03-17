import json
import os
import uuid
from dotenv import load_dotenv
from supabase_db import supabase_db
from supabase_storage import get_supabase_storage
from services.embedding_service import generer_embedding, embedding_to_json

load_dotenv()


def _clean_annees_experience(value):
    if value is None or value == '':
        return None
    
    # Si c'est déjà un entier
    if isinstance(value, int):
        return value
    
    if isinstance(value, str):
        value = value.strip()
        
        if not value:
            return None
        
        try:
            return int(float(value))  # Convertir via float d'abord pour gérer "5.5" -> 5
        except (ValueError, TypeError):
            import re
            numbers = re.findall(r'\d+\.?\d*', value)
            if numbers:
                try:
                    return int(float(numbers[0]))
                except (ValueError, TypeError):
                    pass
    
    return None


def _clean_string_value(value, max_length=None):
    """
    Nettoie une valeur string et la tronque si nécessaire.
    
    Args:
        value: Valeur à nettoyer
        max_length: Longueur maximale (None = pas de limite)
        
    Returns:
        str ou None
    """
    if value is None:
        return None
    
    if not isinstance(value, str):
        value = str(value)
    
    value = value.strip()
    
    if not value:
        return None
    
    if max_length and len(value) > max_length:
        value = value[:max_length]
    
    return value


def _extract_storage_path_from_url(url):
    """
    Extrait le chemin d'objet (storage path) à partir d'une URL MinIO.
    Cette fonction est agnostique du fournisseur (anciennement MinIO, maintenant Supabase Storage).
    Elle renvoie simplement le chemin relatif "bucket/object_path" ou, à défaut,
    la partie après le dernier "/".
    """
    if not url:
        return None
    try:
        # Nouveau comportement : si on reçoit déjà un chemin logique (sans schéma),
        # on le renvoie tel quel, ex: "candidates/Data science/93/image.jpg".
        if "://" not in url and not url.startswith("http"):
            return url

        # Ancien comportement pour les vraies URLs HTTP (MinIO ou Supabase public)
        parts = url.split("/")
        if "storage" in parts and "object" in parts:
            # URL Supabase typique: .../storage/v1/object/public/<bucket>/path/to/file
            try:
                idx = parts.index("public") + 1
                return "/".join(parts[idx:])
            except ValueError:
                pass
        # Fallback générique: tout ce qui suit le dernier "/"
        return url.rsplit("/", 1)[-1]
    except Exception:
        return None


def generate_unique_id_agent():
    """
    Génère un identifiant d'agent unique au format A1-XXXXXX.
    La vérification d'unicité se fait directement dans Supabase (PostgreSQL).
    """
    max_attempts = 100

    # Si Supabase n'est pas configuré, on génère simplement un ID sans vérification forte
    if supabase_db is None:
        random_part = str(uuid.uuid4()).replace("-", "")[:6].upper()
        return f"A1-{random_part}"

    for _ in range(max_attempts):
        random_part = str(uuid.uuid4()).replace("-", "")[:6].upper()
        id_agent = f"A1-{random_part}"

        try:
            resp = supabase_db.table("candidates").select("id").eq("id_agent", id_agent).limit(1).execute()
            if not resp.data:
                return id_agent
        except Exception as e:
            print(f"⚠️  Erreur vérification unicité id_agent dans Supabase: {e}")
            # En cas d'erreur réseau ponctuelle, on retente avec un autre ID
            continue

    raise Exception("Impossible de générer un ID agent unique après plusieurs tentatives (Supabase)")


def create_candidate_record(id_agent: str, user_id: int = None):
    """
    Crée l'enregistrement minimal du candidat directement dans Supabase.
    MySQL n'est plus utilisé comme source de vérité.
    """
    if supabase_db is None:
        raise RuntimeError("Supabase DB non configuré pour create_candidate_record")

    payload = {
        "id_agent": id_agent,
        "nom": "À compléter",
        "prenom": "À compléter",
    }
    if user_id is not None:
        payload["user_id"] = user_id

    try:
        resp = supabase_db.table("candidates").insert(payload).execute()
        if not resp.data:
            raise RuntimeError("Insertion Supabase candidates sans retour de ligne")
        candidate_id = resp.data[0]["id"]
        print(
            f"✅ Enregistrement candidat créé dans Supabase avec ID agent: {id_agent}, "
            f"user_id: {user_id}, ID DB: {candidate_id}"
        )
        return int(candidate_id)
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'enregistrement candidat (Supabase): {e}")
        raise


def insert_talent_card(
    data: dict,
    minio_urls: dict = None,
    candidate_id: int = None,
    candidate_uuid: str | None = None,
):
    """
    Met à jour une Talent Card dans la base de données.
    Si candidate_id est fourni, met à jour l'enregistrement existant.
    Sinon, crée un nouvel enregistrement (comportement de compatibilité).
    
    Args:
        data: Dictionnaire contenant les données de la Talent Card
        minio_urls: Dictionnaire avec les URLs MinIO (cv_url, image_url, talentcard_url)
        candidate_id: ID du candidat à mettre à jour (si None, crée un nouvel enregistrement)
        
    Returns:
        int: L'ID du candidat mis à jour ou inséré, ou None en cas d'erreur
        
    Raises:
        Exception: En cas d'erreur lors de l'insertion/mise à jour
    """
    if supabase_db is None:
        raise RuntimeError("Supabase DB non configuré pour insert_talent_card")

    try:
        # Nettoyer et convertir les valeurs
        annees_exp = _clean_annees_experience(data.get("annees_experience"))

        # Texte pour l'embedding du candidat : domaine + titre + compétences + résumé
        raw_categorie = _clean_string_value(data.get("categorie_profil"), max_length=50) or "autre"
        titre_profil = _clean_string_value(data.get("Titre de profil"), max_length=255) or ""
        skills_list = data.get("skills") or []
        if isinstance(skills_list, str):
            skills_list = [skills_list]
        skills_text = ", ".join([str(s) for s in skills_list if s])
        resume_bref = data.get("resume_bref") or ""
        embedding_text_parts = [
            raw_categorie,
            titre_profil,
            skills_text,
            resume_bref,
        ]
        embedding_text = " | ".join(
            [part for part in embedding_text_parts if part and str(part).strip()]
        )
        candidate_embedding = generer_embedding(embedding_text) if embedding_text else None
        embedding_json = embedding_to_json(candidate_embedding)

        # Normalisation du type de contrat pour stockage en base
        raw_type_contrat = data.get("type_contrat")
        type_contrat_db_value = None
        if raw_type_contrat is not None:
            if isinstance(raw_type_contrat, (list, tuple)):
                cleaned_list = [str(v).strip() for v in raw_type_contrat if v and str(v).strip()]
                try:
                    type_contrat_db_value = json.dumps(cleaned_list)
                except Exception:
                    type_contrat_db_value = ", ".join(cleaned_list)
            else:
                type_contrat_db_value = _clean_string_value(str(raw_type_contrat), max_length=255)

        # URLs provenant de la couche de stockage (désormais Supabase Storage)
        cv_url_to_save = _clean_string_value(minio_urls.get("cv_url"), max_length=500)
        image_url_to_save = _clean_string_value(minio_urls.get("image_url"), max_length=500)
        talentcard_url_to_save = _clean_string_value(minio_urls.get("talentcard_url"), max_length=500)
        talentcard_pdf_url_to_save = _clean_string_value(
            minio_urls.get("talentcard_pdf_url"), max_length=500
        )

        # Préparer le payload candidat pour Supabase
        categorie = raw_categorie
        payload_candidate = {
            "id_agent": _clean_string_value(data.get("id_agent"), max_length=9),
            "nom": _clean_string_value(data.get("nom"), max_length=100),
            "prenom": _clean_string_value(data.get("prenom"), max_length=100),
            "titre_profil": titre_profil,
            "categorie_profil": categorie,
            "ville": _clean_string_value(data.get("ville"), max_length=100),
            "pays": _clean_string_value(data.get("pays"), max_length=100),
            "linkedin": _clean_string_value(data.get("linkedin"), max_length=255),
            "github": _clean_string_value(data.get("github"), max_length=255),
            "behance": _clean_string_value(data.get("behance"), max_length=255),
            "email": _clean_string_value(data.get("email"), max_length=255),
            "phone": _clean_string_value(data.get("phone"), max_length=20),
            "annees_experience": annees_exp,
            "disponibilite": _clean_string_value(data.get("disponibilite"), max_length=50),
            "pret_a_relocater": _clean_string_value(data.get("pret_a_relocater"), max_length=10),
            "niveau_seniorite": _clean_string_value(
                data.get("niveau_seniorite") or data.get("niveau de seniorite"), max_length=100
            ),
            "pays_cible": _clean_string_value(
                data.get("pays_cible") or data.get("target_country"), max_length=255
            ),
            "resume_bref": _clean_string_value(data.get("resume_bref"), max_length=10000),
            "constraints": _clean_string_value(data.get("constraints"), max_length=10000),
            "search_criteria": _clean_string_value(data.get("search_criteria"), max_length=10000),
            "salaire_minimum": _clean_string_value(data.get("salaire_minimum"), max_length=50),
            # On stocke le chemin d'objet Storage (pas l'URL HTTP complète)
            "image_minio_url": (
                (_extract_storage_path_from_url(image_url_to_save) or "")[:500]
                if image_url_to_save
                else None
            ),
            "embedding": embedding_json,
            "type_contrat": (type_contrat_db_value or "")[:255]
            if type_contrat_db_value
            else None,
        }

        # Nettoyer les clés None pour ne pas écraser des valeurs côté Supabase
        payload_candidate = {k: v for k, v in payload_candidate.items() if v is not None}

        if candidate_id:
            # Mise à jour existante
            payload_candidate["id"] = candidate_id
            op = supabase_db.table("candidates").upsert(payload_candidate, on_conflict="id")
            resp = op.execute()
            print(f"✅ Candidat {candidate_id} mis à jour dans Supabase (insert_talent_card)")
        else:
            # Insertion d'un nouveau candidat
            op = supabase_db.table("candidates").insert(payload_candidate)
            resp = op.execute()
            if not resp.data:
                raise RuntimeError("Insertion candidate Supabase sans retour de données")
            candidate_id = resp.data[0]["id"]
            print(f"✅ Candidat créé dans Supabase (ID={candidate_id}) via insert_talent_card")

        # Gestion des URLs de fichiers dans fichiers_versions
        if any([cv_url_to_save, talentcard_url_to_save, talentcard_pdf_url_to_save]):
            db_candidate_uuid = candidate_uuid
            if not db_candidate_uuid:
                # Si aucun UUID fourni, on n'enregistre que la partie candidate_id
                db_candidate_uuid = None

            fv_payload = {
                "candidate_id": int(candidate_id),
            }
            if db_candidate_uuid:
                fv_payload["candidate_uuid"] = db_candidate_uuid

            if cv_url_to_save:
                fv_payload["cv_ancienne_url"] = cv_url_to_save[:500]

            tc_storage_path = _extract_storage_path_from_url(
                talentcard_pdf_url_to_save or talentcard_url_to_save
            )
            if tc_storage_path:
                fv_payload["talent_card_url"] = tc_storage_path[:500]

            if db_candidate_uuid:
                # Contrainte UNIQUE (candidate_id, candidate_uuid)
                supabase_db.table("fichiers_versions").upsert(
                    fv_payload, on_conflict="candidate_id,candidate_uuid"
                ).execute()
            else:
                supabase_db.table("fichiers_versions").insert(fv_payload).execute()

            print(
                f"✅ fichiers_versions synchronisé dans Supabase pour candidate_id={candidate_id}, "
                f"candidate_uuid={db_candidate_uuid}"
            )

        print(f"✅ Candidat {data.get('nom', 'N/A')} inséré/maj avec succès (ID DB: {candidate_id})")
        return int(candidate_id)

    except Exception as err:
        print(f"❌ Erreur lors de insert_talent_card (Supabase): {err}")
        raise


def insert_talent_card_from_file(json_file_path: str):
    """
    Fonction de compatibilité : charge un fichier JSON et l'insère.
    
    Args:
        json_file_path: Chemin vers le fichier JSON
    """
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return insert_talent_card(data)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
        insert_talent_card_from_file(json_file)
    else:
        print("Usage: python insert_data.py <path_to_json_file>")