"""
Module pour sauvegarder les réponses du chatbot, extraire les liens et télécharger les images
"""

import re
import json
import requests
import os
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
from datetime import datetime

from supabase_db import supabase_db
from supabase_storage import get_supabase_storage


def extract_urls(text: str) -> List[str]:
    """
    Extrait toutes les URLs d'un texte.
    
    Args:
        text: Texte contenant potentiellement des URLs
    
    Returns:
        Liste des URLs trouvées
    """
    if not text:
        return []
    
    # Pattern pour détecter les URLs
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+[^\s<>"{}|\\^`\[\].,;:!?]'
    urls = re.findall(url_pattern, text)
    
    # Nettoyer les URLs (enlever les caractères de ponctuation à la fin)
    cleaned_urls = []
    for url in urls:
        # Enlever les caractères de ponctuation à la fin
        url = url.rstrip('.,;:!?)')
        if url:
            cleaned_urls.append(url)
    
    return cleaned_urls


def extract_github_urls(text: str) -> List[str]:
    """
    Extrait spécifiquement les URLs GitHub.
    
    Args:
        text: Texte contenant potentiellement des URLs GitHub
    
    Returns:
        Liste des URLs GitHub trouvées
    """
    urls = extract_urls(text)
    github_urls = [url for url in urls if 'github.com' in url.lower()]
    return github_urls


def extract_demo_urls(text: str) -> List[str]:
    """
    Extrait les URLs de démo (netlify, vercel, heroku, etc.).
    
    Args:
        text: Texte contenant potentiellement des URLs de démo
    
    Returns:
        Liste des URLs de démo trouvées
    """
    urls = extract_urls(text)
    demo_domains = ['netlify.app', 'vercel.app', 'herokuapp.com', 'github.io', 
                    'surge.sh', 'firebaseapp.com', 'appspot.com', 'railway.app']
    demo_urls = [url for url in urls if any(domain in url.lower() for domain in demo_domains)]
    return demo_urls


def extract_image_urls(text: str) -> List[str]:
    """
    Extrait les URLs d'images depuis un texte.
    
    Args:
        text: Texte contenant potentiellement des URLs d'images
    
    Returns:
        Liste des URLs d'images trouvées
    """
    urls = extract_urls(text)
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
    image_urls = []
    
    for url in urls:
        # Vérifier l'extension dans l'URL
        parsed = urlparse(url)
        path_lower = parsed.path.lower()
        if any(path_lower.endswith(ext) for ext in image_extensions):
            image_urls.append(url)
        # Vérifier aussi les URLs d'images hébergées (imgur, etc.)
        elif any(domain in url.lower() for domain in ['imgur.com', 'i.imgur.com', 'cloudinary.com']):
            image_urls.append(url)
    
    return image_urls


def download_image_from_url(image_url: str, candidate_id: int, project_name: str, image_index: int = 0) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Télécharge une image depuis une URL et la sauvegarde dans Supabase Storage.
    
    Args:
        image_url: URL de l'image à télécharger (peut être une URL externe ou une URL MinIO interne)
        candidate_id: ID du candidat
        project_name: Nom du projet (pour le chemin)
        image_index: Index de l'image (pour éviter les collisions)
    
    Returns:
        Tuple (success, minio_url, error_message)
    """
    try:
        supabase_storage = get_supabase_storage()
        if not supabase_storage or not supabase_storage.client:
            return False, None, "Supabase Storage non initialisé"
        
        storage_object_name: Optional[str] = None
        image_bytes: Optional[bytes] = None
        content_type: Optional[str] = None
        extension: str = ".jpg"
        
        # URL externe, télécharger avec requests
        response = requests.get(image_url, timeout=30, stream=True)
        response.raise_for_status()

        # Vérifier le content-type
        content_type_header = response.headers.get("content-type", "")
        if not content_type_header.startswith("image/"):
            return False, None, f"L'URL ne pointe pas vers une image (content-type: {content_type_header})"

        # Lire le contenu
        image_bytes = response.content

        # Déterminer l'extension
        parsed = urlparse(image_url)
        extension = os.path.splitext(parsed.path)[1] or ".jpg"
        if extension.lower() not in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]:
            extension = ".jpg"  # Par défaut

        # Nom canonique de l'objet pour ce candidat/projet
        from candidate_minio_path import get_candidate_minio_prefix

        safe_project_name = re.sub(r"[^a-zA-Z0-9_-]", "_", project_name)[:50]
        storage_object_name = f"{get_candidate_minio_prefix(candidate_id)}projects/{safe_project_name}/image_{image_index}{extension}"

        # Déterminer le content-type d'upload (on se base sur l'en-tête HTTP si disponible)
        content_type = content_type_header or "image/jpeg"
        
        if not image_bytes or not storage_object_name:
            return False, None, "Impossible de préparer l'image pour le stockage"
        
        # Upload vers Supabase Storage
        sup_success, sup_url, sup_error = supabase_storage.upload_file(
            image_bytes,
            storage_object_name,
            content_type=content_type,
        )
        if sup_success and sup_url:
            return True, sup_url, None

        return False, None, f"Erreur upload image vers Supabase Storage: {sup_error}"
            
    except requests.exceptions.RequestException as e:
        return False, None, f"Erreur lors du téléchargement de l'image: {str(e)}"
    except Exception as e:
        return False, None, f"Erreur inattendue: {str(e)}"


def parse_answer_for_project_info(answer: str) -> Dict:
    """
    Parse une réponse pour extraire les informations structurées sur un projet.
    
    Args:
        answer: Réponse textuelle du candidat
    
    Returns:
        Dictionnaire avec les informations extraites
    """
    info = {
        "github_urls": [],
        "demo_urls": [],
        "image_urls": [],
        "other_urls": [],
        "description": answer,
        "technologies": [],
        "role": None,
        "challenges": None
    }
    
    # Extraire les URLs
    all_urls = extract_urls(answer)
    info["github_urls"] = extract_github_urls(answer)
    info["demo_urls"] = extract_demo_urls(answer)
    info["image_urls"] = extract_image_urls(answer)
    
    # Autres URLs (non GitHub, non démo, non image)
    other_urls = [url for url in all_urls 
                  if url not in info["github_urls"] 
                  and url not in info["demo_urls"] 
                  and url not in info["image_urls"]]
    info["other_urls"] = other_urls
    
    # Essayer d'extraire les technologies (mots-clés communs)
    tech_keywords = ['python', 'javascript', 'react', 'node', 'django', 'flask', 
                     'angular', 'vue', 'mysql', 'postgresql', 'mongodb', 'redis',
                     'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git',
                     'html', 'css', 'typescript', 'java', 'spring', 'php', 'laravel']
    
    answer_lower = answer.lower()
    found_techs = [tech for tech in tech_keywords if tech in answer_lower]
    if found_techs:
        info["technologies"] = found_techs
    
    return info


def save_chat_responses_to_minio(
    candidate_id: int,
    answers: Dict[str, str],
    questions: List[Dict],
    projects_list: Optional[List[str]] = None
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Sauvegarde toutes les réponses du chat dans un fichier JSON dans Supabase Storage.
    
    Args:
        candidate_id: ID du candidat
        answers: Dictionnaire {question_id: answer}
        questions: Liste des questions avec leurs IDs
        projects_list: Liste des projets identifiés (optionnel)
    
    Returns:
        Tuple (success, minio_url, error_message)
    """
    try:
        # Préparer les données à sauvegarder
        chat_data = {
            "candidate_id": candidate_id,
            "saved_at": datetime.now().isoformat(),
            "questions": questions,
            "answers": answers,
            "projects_list": projects_list or [],
            "total_questions": len(questions),
            "total_answers": len(answers)
        }
        
        # Convertir en JSON
        json_bytes = json.dumps(chat_data, ensure_ascii=False, indent=2).encode('utf-8')
        
        # Nom du fichier dans le stockage
        from candidate_minio_path import get_candidate_minio_prefix

        object_name = f"{get_candidate_minio_prefix(candidate_id)}chat_responses.json"

        # Upload vers Supabase Storage
        supabase_storage = get_supabase_storage()
        if not supabase_storage or not supabase_storage.client:
            return False, None, "Supabase Storage non initialisé"

        sup_success, sup_url, sup_error = supabase_storage.upload_file(
            json_bytes,
            object_name,
            content_type="application/json",
        )
        if sup_success and sup_url:
            print(f"✅ Réponses du chat sauvegardées dans Supabase Storage: {sup_url}")
            return True, sup_url, None

        return False, None, f"Erreur upload chat_responses.json vers Supabase Storage ({object_name}): {sup_error}"
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False, None, f"Erreur lors de la sauvegarde des réponses: {str(e)}"


def get_chat_responses_from_minio(candidate_id: int) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Récupère les réponses du chat depuis Supabase Storage.
    
    Args:
        candidate_id: ID du candidat
    
    Returns:
        Tuple (success, chat_data, error_message)
    """
    try:
        from candidate_minio_path import get_candidate_minio_prefix

        object_name = f"{get_candidate_minio_prefix(candidate_id)}chat_responses.json"
        folder = get_candidate_minio_prefix(candidate_id).rstrip("/")

        storage = get_supabase_storage()
        if not storage or not storage.client:
            return False, None, "Supabase Storage non initialisé"

        # Evite un download qui génère un log d'erreur 404 attendu
        # quand le chatbot n'a pas encore produit de réponses.
        try:
            listed = storage.list_files(folder)
            exists = any(
                ((item.get("name", "") if isinstance(item, dict) else str(item)) == "chat_responses.json")
                for item in listed
            )
            if not exists:
                return False, None, "chat_responses.json absent (normal avant collecte chatbot)"
        except Exception:
            # En cas d'échec du listage, on tente quand même le download.
            pass

        success, file_bytes, error = storage.download_file(object_name)

        if not success or not file_bytes:
            return False, None, error or "Fichier introuvable dans le stockage"

        # Parser le JSON
        chat_data = json.loads(file_bytes.decode("utf-8"))
        print(f"✅ Réponses du chat récupérées depuis Supabase Storage pour candidat {candidate_id}")
        return True, chat_data, None

    except json.JSONDecodeError as e:
        return False, None, f"Erreur de parsing JSON: {str(e)}"
    except Exception as e:
        return False, None, f"Erreur lors de la récupération: {str(e)}"


def save_project_responses(
    candidate_id: int,
    project_name: str,
    answers: Dict[str, str],
    questions: List[Dict],
    projects_list: Optional[List[str]] = None
) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Sauvegarde les réponses de projets UNIQUEMENT dans MinIO / Supabase Storage
    (plus aucune écriture dans les tables SQL candidate_projects).
    
    Args:
        candidate_id: ID du candidat
        project_name: Nom du projet
        answers: Dictionnaire {question_id: answer}
        questions: Liste des questions avec leurs IDs
        projects_list: Liste des projets identifiés (optionnel)
    
    Returns:
        Tuple (success, project_id, error_message)
    """
    try:
        # Parser toutes les réponses pour extraire les informations structurées
        all_info = {
            "github_urls": [],
            "demo_urls": [],
            "image_urls": [],
            "other_urls": [],
            "descriptions": [],
            "technologies": set(),
            # ❌ SUPPRIMÉ : "additional_info": {} - On ne stocke plus les réponses brutes en DB
        }
        
        # Traiter chaque réponse
        for question_id, answer in answers.items():
            if not answer or not answer.strip():
                continue
            
            parsed = parse_answer_for_project_info(answer)
            
            # Agréger les informations
            all_info["github_urls"].extend(parsed["github_urls"])
            all_info["demo_urls"].extend(parsed["demo_urls"])
            all_info["image_urls"].extend(parsed["image_urls"])
            all_info["other_urls"].extend(parsed["other_urls"])
            all_info["descriptions"].append(parsed["description"])
            all_info["technologies"].update(parsed["technologies"])
        
        # Télécharger les images et les sauvegarder dans MinIO
        minio_image_urls = []
        for idx, image_url in enumerate(all_info["image_urls"]):
            success, minio_url, error = download_image_from_url(
                image_url, candidate_id, project_name, idx
            )
            if success:
                minio_image_urls.append(minio_url)
                print(f"✅ Image téléchargée et sauvegardée: {minio_url}")
            else:
                print(f"⚠️  Erreur téléchargement image {image_url}: {error}")
                # Garder l'URL originale si le téléchargement échoue
                minio_image_urls.append(image_url)
        
        # Préparer les données pour la base de données
        github_url = all_info["github_urls"][0] if all_info["github_urls"] else None
        demo_url = all_info["demo_urls"][0] if all_info["demo_urls"] else None
        
        # Description combinée
        detailed_description = " ".join(all_info["descriptions"]) if all_info["descriptions"] else None
        
        # Technologies (convertir set en list)
        technologies = list(all_info["technologies"]) if all_info["technologies"] else []
        
        # Liens additionnels (autres URLs)
        additional_links = all_info["other_urls"] if all_info["other_urls"] else []
        
        # On ne persiste plus dans la base SQL (candidate_projects supprimée).
        # On considère la sauvegarde réussie dès lors que le traitement Storage a été effectué.
        print(f"✅ Projet traité (Storage / URLs) pour candidate_id={candidate_id}, project_name={project_name}")
        return True, None, None
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False, None, f"Erreur lors de la sauvegarde: {str(e)}"
