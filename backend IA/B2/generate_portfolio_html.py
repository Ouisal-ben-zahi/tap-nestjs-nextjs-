"""
Agent de génération de portfolios HTML
Génère automatiquement les versions HTML (longue et one-page) à partir des données JSON du portfolio
"""

import os
import json
from typing import Dict, Optional, Tuple, List, Any
from jinja2 import Template, Environment, FileSystemLoader
from B2.agent_portfolio import generate_portfolio_content, transform_portfolio_data_for_template
from supabase_storage import get_supabase_storage


def _dim_score(dims: Dict, key: str, *fallback_keys: str) -> Optional[float]:
    """
    Récupère le score d'une dimension, en gérant les anciens et nouveaux noms de clés.
    
    Certains outputs A2 récents utilisent par exemple :
      - "hard_skills_fit" au lieu de "hard_skills_depth"
      - "communication_clarte" au lieu de "communication"
      - "coherence_parcours" au lieu de "coherence"
      - "stabilite_risque" au lieu de "stabilite"
    On accepte donc une liste de clés possibles.
    """
    keys = (key,) + fallback_keys
    for k in keys:
        v = dims.get(k)
        if v is None:
            continue
        if isinstance(v, dict) and "score" in v:
            return v.get("score")
        if isinstance(v, (int, float)):
            return float(v)
    return None


def _inject_scoring_into_candidate(candidate: Dict, candidate_id: int) -> None:
    """
    Remplace le score global et les détails (compétences techniques, comportementales, etc.)
    par ceux de l'agent A2 (scoring). La justification reste basée sur les 5 dimensions
    (technique, comportemental, autonomie, apprentissage, comportement pro), pas sur les soft skills déclarés.
    Les données sont lues depuis Supabase Storage (et non plus depuis un fichier local).
    """
    try:
        from candidate_minio_path import get_candidate_minio_prefix
        from supabase_storage import get_supabase_storage
    except Exception as e:
        print(f"⚠️ Impossible d'importer les dépendances Supabase pour le scoring A2: {e}")
        return

    try:
        supabase_storage = get_supabase_storage()
        if not supabase_storage or not supabase_storage.client:
            print("⚠️ Client Supabase non initialisé pour lecture de l'analyse A2")
            return

        minio_prefix = get_candidate_minio_prefix(candidate_id)
        object_name = f"{minio_prefix}a2_analyse.json"

        success, file_bytes, error = supabase_storage.download_file(object_name)
        if not success or not file_bytes:
            print(f"⚠️ Analyse A2 introuvable dans Supabase Storage pour candidat {candidate_id}: {error}")
            return

        analyse = json.loads(file_bytes.decode("utf-8"))
    except Exception as e:
        print(f"⚠️ Impossible de charger l'analyse A2 depuis Supabase Storage pour le scoring: {e}")
        return
    scores = analyse.get("scores") or {}
    score_global = scores.get("score_global")
    if score_global is None:
        return
    dims = scores.get("dimensions") or {}
    # Mapping des 6 dimensions A2 vers les 5 dimensions du template (technique, comportemental, autonomie, apprentissage, pro)
    # On gère à la fois les anciens et les nouveaux noms de dimensions.
    hard_skills = _dim_score(dims, "hard_skills_depth", "hard_skills_fit")
    soft_skills = _dim_score(dims, "communication", "communication_clarte")  # compétences comportementales
    autonomy = _dim_score(dims, "coherence", "coherence_parcours")  # autonomie / cohérence parcours
    learning_ability = _dim_score(dims, "rarete_marche")  # capacité à se différencier
    professional_behavior = _dim_score(dims, "stabilite", "stabilite_risque")  # stabilité / comportement pro
    score_details = {
        "hard_skills": hard_skills,
        "soft_skills": soft_skills,
        "autonomy": autonomy,
        "autonomie": autonomy,
        "learning_ability": learning_ability,
        "professional_behavior": professional_behavior,
    }
    candidate["score_global"] = score_global
    candidate["global_score"] = score_global
    if candidate.get("readiness_score") is None:
        candidate["readiness_score"] = {}
    candidate["readiness_score"]["global_score"] = score_global
    candidate["score_details"] = score_details
    print("✅ Scores A2 injectés (score global + 5 dimensions technique/comportemental)")


def get_template_path(template_name: str) -> Optional[str]:
    """
    Trouve le chemin du template HTML.
    
    Args:
        template_name: Nom du template (ex: "portfolio_1page_template.html")
    
    Returns:
        Chemin absolu du template ou None si introuvable
    """
    # Chemins possibles (dans l'ordre de priorité)
    possible_paths = [
        # Depuis le backend (si le frontend est monté)
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                     "frontend", "src", "20260312_044613", template_name),
        # Depuis le conteneur Docker
        f"/app/frontend/src/20260312_044613/{template_name}",
        # Depuis le volume monté
        f"/frontend/src/20260312_044613/{template_name}",
        # Depuis le répertoire courant
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "20260312_044613", template_name),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None


def convert_project_images_to_proxy(projects: list, flask_base_url: str = "http://localhost:5002") -> list:
    """
    Normalise les URLs d'images de projets pour le portfolio.

    - Si une valeur est déjà une URL HTTP(S), on la laisse telle quelle.
    - Si c'est un chemin Supabase Storage (ex: 'candidates/.../image.jpg'),
      on essaie de générer une URL signée via Supabase Storage.
    """
    if not projects or not isinstance(projects, list):
        return projects

    def normalize_image_url(path: str) -> str:
        if not path:
            return path
        path = path.strip()
        if path.startswith("http://") or path.startswith("https://"):
            return path
        # Chemin interne Supabase Storage → URL signée
        try:
            storage = get_supabase_storage()
            if storage and storage.client:
                signed = storage.get_file_url(path)
                if signed:
                    return signed
        except Exception as e:
            print(f"⚠️ Impossible de générer une URL Supabase pour l'image de projet '{path}': {e}")
        return path

    for project in projects:
        if not isinstance(project, dict):
            continue

        # main_image_url
        if project.get("main_image_url"):
            project["main_image_url"] = normalize_image_url(project["main_image_url"])

        # preview_images
        if project.get("preview_images") and isinstance(project["preview_images"], list):
            for img in project["preview_images"]:
                if isinstance(img, dict) and img.get("url"):
                    img["url"] = normalize_image_url(img["url"])

        # images (liste de str ou dicts)
        if project.get("images") and isinstance(project["images"], list):
            converted_images = []
            for img in project["images"]:
                if isinstance(img, str):
                    converted_images.append(normalize_image_url(img))
                elif isinstance(img, dict) and img.get("url"):
                    img["url"] = normalize_image_url(img["url"])
                    converted_images.append(img)
                else:
                    converted_images.append(img)
            project["images"] = converted_images

    return projects


def _merge_one_page_bilingual(template_data_fr: Dict, template_data_en: Dict, flask_base_url: str, candidate_id: int, candidate_uuid: Optional[str], candidate_image_url: Optional[str], candidate_email: Optional[str], candidate_phone: Optional[str], candidate_job_title: Optional[str], candidate_years_experience: Optional[int], candidate_linkedin_url: Optional[str], candidate_github_url: Optional[str], lang: str) -> Dict:
    """Fusionne les données FR et EN pour la one-page afin que le sélecteur de langue change tout le contenu."""
    c_fr = template_data_fr.get("candidate") or {}
    c_en = template_data_en.get("candidate") or {}
    # Base = langue demandée
    candidate = dict(c_fr if lang == "fr" else c_en)
    candidate["about_text_fr"] = (c_fr.get("about_text") or "").strip()
    candidate["about_text_en"] = (c_en.get("about_text") or "").strip()
    if not candidate.get("about_text"):
        candidate["about_text"] = candidate["about_text_fr"] if lang == "fr" else candidate["about_text_en"]

    def _merge_list(key: str, title_keys: Tuple[str, ...], desc_key: Optional[str] = None):
        list_fr = c_fr.get(key) or []
        list_en = c_en.get(key) or []
        merged = []
        for i in range(max(len(list_fr), len(list_en))):
            a = list_fr[i] if i < len(list_fr) else {}
            b = list_en[i] if i < len(list_en) else {}
            if not isinstance(a, dict):
                a = {}
            if not isinstance(b, dict):
                b = {}
            item = dict(a if lang == "fr" else b)
            for k in title_keys:
                v_fr = a.get(k, a.get("title", a.get("name", a.get("role", ""))))
                v_en = b.get(k, b.get("title", b.get("name", b.get("role", ""))))
                if isinstance(v_fr, dict):
                    v_fr = v_fr.get("name", "") or v_fr.get("title", "")
                if isinstance(v_en, dict):
                    v_en = v_en.get("name", "") or v_en.get("title", "")
                item[k + "_fr"] = (v_fr or "").strip() if v_fr is not None else ""
                item[k + "_en"] = (v_en or "").strip() if v_en is not None else ""
            if desc_key:
                item["description_fr"] = (a.get(desc_key, a.get("description", a.get("context", ""))) or "").strip()
                item["description_en"] = (b.get(desc_key, b.get("description", b.get("context", ""))) or "").strip()
            merged.append(item)
        return merged

    # Formations (learning_growth)
    lg_fr = c_fr.get("learning_growth") or {}
    lg_en = c_en.get("learning_growth") or {}
    formations_fr = lg_fr.get("certifications", []) or lg_fr.get("self_learning", []) or []
    formations_en = lg_en.get("certifications", []) or lg_en.get("self_learning", []) or []
    merged_formations = []
    for i in range(max(len(formations_fr), len(formations_en))):
        a = formations_fr[i] if i < len(formations_fr) else {}
        b = formations_en[i] if i < len(formations_en) else {}
        if not isinstance(a, dict):
            a = {}
        if not isinstance(b, dict):
            b = {}
        name_fr = (a.get("name", a.get("title", "")) or "").strip()
        name_en = (b.get("name", b.get("title", "")) or "").strip()
        org_fr = (a.get("organization", a.get("institution", "")) or "").strip()
        org_en = (b.get("organization", b.get("institution", "")) or "").strip()
        # Fallback : si la version EN est vide, utiliser la FR pour éviter contenu vide au switcher
        if not name_en and name_fr:
            name_en = name_fr
        if not org_en and org_fr:
            org_en = org_fr
        year = a.get("year", b.get("year", ""))
        merged_formations.append({
            "name": name_fr if lang == "fr" else name_en,
            "name_fr": name_fr,
            "name_en": name_en,
            "organization": org_fr if lang == "fr" else org_en,
            "organization_fr": org_fr,
            "organization_en": org_en,
            "year": year,
            "title": name_fr if lang == "fr" else name_en,
            "institution": org_fr if lang == "fr" else org_en,
        })
    candidate["learning_growth"] = {
        "certifications": merged_formations,
        "self_learning": merged_formations,
    }

    # Langues (pour switcher FR/EN : name et level en français et en anglais)
    lang_fr = c_fr.get("languages") or []
    lang_en = c_en.get("languages") or []
    merged_languages = []
    for i in range(max(len(lang_fr), len(lang_en))):
        a = lang_fr[i] if i < len(lang_fr) else {}
        b = lang_en[i] if i < len(lang_en) else {}
        if not isinstance(a, dict):
            a = {}
        if not isinstance(b, dict):
            b = {}
        name_fr = (a.get("name", a.get("language", "")) or "").strip()
        name_en = (b.get("name", b.get("language", "")) or "").strip()
        level_fr = (a.get("level", "") or "").strip()
        level_en = (b.get("level", "") or "").strip()
        if not name_en and name_fr:
            name_en = name_fr
        if not level_en and level_fr:
            level_en = level_fr
        merged_languages.append({
            "name": name_fr if lang == "fr" else name_en,
            "name_fr": name_fr,
            "name_en": name_en,
            "level": level_fr if lang == "fr" else level_en,
            "level_fr": level_fr,
            "level_en": level_en,
        })
    candidate["languages"] = merged_languages

    # Expériences
    exp_fr = c_fr.get("experiences") or []
    exp_en = c_en.get("experiences") or []
    merged_exp = []
    for i in range(max(len(exp_fr), len(exp_en))):
        a = exp_fr[i] if i < len(exp_fr) else {}
        b = exp_en[i] if i < len(exp_en) else {}
        if not isinstance(a, dict):
            a = {}
        if not isinstance(b, dict):
            b = {}
        item = dict(a if lang == "fr" else b)
        item["title_fr"] = (a.get("title", a.get("role", "")) or "").strip()
        item["title_en"] = (b.get("title", b.get("role", "")) or "").strip()
        item["company_fr"] = (a.get("company", a.get("organization", "")) or "").strip()
        item["company_en"] = (b.get("company", b.get("organization", "")) or "").strip()
        item["description_fr"] = (a.get("description", a.get("value_brought", "")) or "").strip()
        item["description_en"] = (b.get("description", b.get("value_brought", "")) or "").strip()
        merged_exp.append(item)
    candidate["experiences"] = merged_exp

    # Compétences techniques (liste plate pour les tags de skills dans le template)
    hard_skills_fr = c_fr.get("hard_skills") or []
    hard_skills_en = c_en.get("hard_skills") or []
    skills_tags: list[dict] = []

    def _append_skill_tags(source_list):
        for s in source_list:
            if isinstance(s, dict):
                name = (s.get("name") or s.get("skill") or s.get("label") or "").strip()
            else:
                name = str(s).strip()
            if name and not any(existing.get("name") == name for existing in skills_tags):
                skills_tags.append({"name": name})

    if isinstance(hard_skills_fr, list):
        _append_skill_tags(hard_skills_fr)
    if isinstance(hard_skills_en, list):
        _append_skill_tags(hard_skills_en)

    candidate["skills"] = skills_tags

    # Projets
    proj_fr = c_fr.get("projects") or []
    proj_en = c_en.get("projects") or []
    merged_proj = []
    for i in range(max(len(proj_fr), len(proj_en))):
        a = proj_fr[i] if i < len(proj_fr) else {}
        b = proj_en[i] if i < len(proj_en) else {}
        if not isinstance(a, dict):
            a = {}
        if not isinstance(b, dict):
            b = {}
        item = dict(a if lang == "fr" else b)
        item["title_fr"] = (a.get("title", a.get("name", "")) or "").strip()
        item["title_en"] = (b.get("title", b.get("name", "")) or "").strip()
        item["description_fr"] = (a.get("description", a.get("context", a.get("value_brought", ""))) or "").strip()
        item["description_en"] = (b.get("description", b.get("context", b.get("value_brought", ""))) or "").strip()
        merged_proj.append(item)
    candidate["projects"] = merged_proj

    # Skill categories : exactement 6 catégories, avec version FR et EN pour le switcher de langue
    skill_categories_fr = (c_fr.get("skill_categories") or [])[:6]
    skill_categories_en = (c_en.get("skill_categories") or [])[:6]
    
    merged_skill_categories = []
    for i in range(6):
        fr_val = skill_categories_fr[i] if i < len(skill_categories_fr) and skill_categories_fr[i] else ""
        en_val = skill_categories_en[i] if i < len(skill_categories_en) and skill_categories_en[i] else ""
        if not en_val and fr_val:
            en_val = fr_val  # fallback: réutiliser le libellé FR si EN vide
        if not fr_val and en_val:
            fr_val = en_val
        merged_skill_categories.append({"fr": fr_val or "", "en": en_val or ""})
    
    if merged_skill_categories:
        candidate["skill_categories"] = merged_skill_categories
    else:
        # Fallback : créer depuis hard_skills si disponible
        hard_skills_fr = c_fr.get("hard_skills") or []
        hard_skills_en = c_en.get("hard_skills") or []
        categories_fr = list({s.get("category", "") for s in hard_skills_fr if isinstance(s, dict) and s.get("category")})[:6]
        categories_en = list({s.get("category", "") for s in hard_skills_en if isinstance(s, dict) and s.get("category")})[:6]
        merged_skill_categories = []
        for i in range(6):
            fr_val = categories_fr[i] if i < len(categories_fr) else ""
            en_val = categories_en[i] if i < len(categories_en) else fr_val
            merged_skill_categories.append({"fr": fr_val, "en": en_val or fr_val})
        candidate["skill_categories"] = merged_skill_categories

    return {"candidate": candidate, "portfolio": template_data_fr.get("portfolio", {})}


def generate_portfolio_html(
    candidate_id: int,
    version: str = "one-page",
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
    candidate_availability: Optional[str] = None,
    candidate_contract_type: Optional[str] = None,
    long_template_path: Optional[str] = None,
    lang: str = "fr"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Génère le HTML du portfolio à partir des données du candidat.
    
    Args:
        candidate_id: ID du candidat en base de données
        version: Version du portfolio ("one-page" ou "long")
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
        print(f"🔄 Génération du portfolio HTML (version: {version}) pour candidate_id={candidate_id}")
        
        # 1. Générer le contenu du portfolio (JSON brut)
        # one-page : pas besoin de chat_responses (détails projets), CV seul suffit
        require_chat = version != "one-page"
        lang = (lang or "fr").lower() if lang else "fr"
        if lang not in ("fr", "en"):
            lang = "fr"
        template_data_fr: Optional[Dict] = None
        template_data_en: Optional[Dict] = None
        if version == "one-page":
            # One-page : générer FR et EN pour que le sélecteur change tout le contenu
            success_fr, data_fr, err_fr = generate_portfolio_content(
                candidate_id, output_json_path=None, require_chat_responses=False, lang="fr"
            )
            success_en, data_en, err_en = generate_portfolio_content(
                candidate_id, output_json_path=None, require_chat_responses=False, lang="en"
            )
            if not success_fr and not success_en:
                return False, None, f"Erreur génération contenu: {err_fr or err_en}"
            # Normaliser l'URL de photo candidat (chemin Supabase -> URL signée)
            normalized_candidate_image_url = candidate_image_url
            if candidate_image_url and not (
                candidate_image_url.startswith("http://")
                or candidate_image_url.startswith("https://")
            ):
                try:
                    storage = get_supabase_storage()
                    if storage and storage.client:
                        signed = storage.get_file_url(candidate_image_url)
                        if signed:
                            normalized_candidate_image_url = signed
                except Exception as e:
                    print(f"⚠️ Impossible de générer une URL Supabase pour l'image portfolio '{candidate_image_url}': {e}")

            if success_fr:
                template_data_fr = transform_portfolio_data_for_template(
                    data_fr, candidate_image_url=normalized_candidate_image_url, candidate_job_title=candidate_job_title,
                    candidate_years_experience=candidate_years_experience, candidate_email=candidate_email,
                    candidate_phone=candidate_phone
                )
            if success_en:
                template_data_en = transform_portfolio_data_for_template(
                    data_en, candidate_image_url=normalized_candidate_image_url, candidate_job_title=candidate_job_title,
                    candidate_years_experience=candidate_years_experience, candidate_email=candidate_email,
                    candidate_phone=candidate_phone
                )
            if template_data_fr and template_data_en:
                template_data = _merge_one_page_bilingual(
                    template_data_fr, template_data_en,
                    flask_base_url=flask_base_url or "http://localhost:5002",
                    candidate_id=candidate_id, candidate_uuid=candidate_uuid,
                    candidate_image_url=normalized_candidate_image_url, candidate_email=candidate_email,
                    candidate_phone=candidate_phone, candidate_job_title=candidate_job_title,
                    candidate_years_experience=candidate_years_experience,
                    candidate_linkedin_url=candidate_linkedin_url or "",
                    candidate_github_url=candidate_github_url or "",
                    lang=lang
                )
            else:
                template_data = template_data_fr or template_data_en
            print("✅ Contenu du portfolio one-page (FR+EN) généré avec succès")
        else:
            success, portfolio_data, error = generate_portfolio_content(
                candidate_id,
                output_json_path=None,
                require_chat_responses=require_chat,
                use_original_cv=(version == "long"),
                lang=lang
            )
            if not success:
                return False, None, f"Erreur lors de la génération du contenu: {error}"
            print("✅ Contenu du portfolio généré avec succès")
            # Normaliser la photo candidat pour la version longue également
            normalized_candidate_image_url = candidate_image_url
            if candidate_image_url and not (
                candidate_image_url.startswith("http://")
                or candidate_image_url.startswith("https://")
            ):
                try:
                    storage = get_supabase_storage()
                    if storage and storage.client:
                        signed = storage.get_file_url(candidate_image_url)
                        if signed:
                            normalized_candidate_image_url = signed
                except Exception as e:
                    print(f"⚠️ Impossible de générer une URL Supabase pour l'image portfolio '{candidate_image_url}': {e}")

            template_data = transform_portfolio_data_for_template(
                portfolio_data,
                candidate_image_url=normalized_candidate_image_url,
                candidate_job_title=candidate_job_title,
                candidate_years_experience=candidate_years_experience,
                candidate_email=candidate_email,
                candidate_phone=candidate_phone
            )
        
        # 2.1 Convertir les URLs MinIO des images de projets en URLs proxy
        if template_data.get("candidate") and template_data["candidate"].get("projects"):
            print(f"🔄 Conversion des URLs d'images pour {len(template_data['candidate']['projects'])} projets...")
            template_data["candidate"]["projects"] = convert_project_images_to_proxy(
                template_data["candidate"]["projects"],
                flask_base_url
            )
        
        # 2.2 Lien de téléchargement du CV (nouveau / corrigé)
        if template_data.get("candidate") and candidate_uuid:
            template_data["candidate"]["cv_download_url"] = (
                f"{flask_base_url.rstrip('/')}/correctedcv/{candidate_uuid}/download?db_candidate_id={candidate_id}"
            )
        elif template_data.get("candidate"):
            template_data["candidate"]["cv_download_url"] = ""
        
        # 2.3 LinkedIn / GitHub / Behance depuis la base (priorité sur les données générées)
        if template_data.get("candidate"):
            if candidate_linkedin_url:
                template_data["candidate"]["linkedin_url"] = candidate_linkedin_url
            if candidate_github_url:
                template_data["candidate"]["github_url"] = candidate_github_url
            if candidate_behance_url:
                template_data["candidate"]["behance_url"] = candidate_behance_url
            # 2.4 Poste cible : disponibilité et type de contrat (choix du candidat au début)
            if candidate_availability:
                template_data["candidate"]["availability"] = candidate_availability
                template_data["candidate"]["disponibilite"] = candidate_availability
            if candidate_contract_type:
                template_data["candidate"]["contract_type"] = candidate_contract_type
                template_data["candidate"]["type_contrat"] = [s.strip() for s in candidate_contract_type.split(",") if s.strip()]
        
        # 2.5 Portfolio long : score global et justification (5 dimensions) issus de l'agent A2
        # + préparation des structures attendues par le template long (pages multiples)
        extra_ctx = {}
        if version == "long" and template_data.get("candidate"):
            _inject_scoring_into_candidate(template_data["candidate"], candidate_id)
            cand = template_data["candidate"]

            # Page 2 – compétences techniques groupées par catégorie
            skill_categories = cand.get("skill_categories") or []
            technical_skills = cand.get("technical_skills") or cand.get("skills") or []
            skill_categories_sorted = []
            if isinstance(skill_categories, list) and isinstance(technical_skills, list):
                for cat in skill_categories:
                    if isinstance(cat, dict):
                        cat_name = cat.get("fr") or cat.get("en") or ""
                    else:
                        cat_name = str(cat)
                    if not cat_name:
                        continue
                    items = []
                    for s in technical_skills:
                        s_name = s
                        if isinstance(s, dict):
                            s_name = s.get("name") or s.get("skill") or s.get("label")
                        if not s_name:
                            continue
                        items.append({"name": str(s_name)})
                    skill_categories_sorted.append({
                        "category": cat_name,
                        "avg_level": 3,
                        "status": "Actif",
                        "list": items,
                    })
            extra_ctx["skill_categories_sorted"] = skill_categories_sorted

            # Page 3 – soft skills (simple liste avec score 3/5 par défaut)
            soft_skills_list = cand.get("soft_skills") or []
            soft_skills_data = []
            for s in soft_skills_list:
                if isinstance(s, dict):
                    name = s.get("name") or s.get("label") or ""
                else:
                    name = str(s)
                if not name:
                    continue
                soft_skills_data.append({
                    "name": name,
                    "score": 3,
                })
            extra_ctx["soft_skills_data"] = soft_skills_data

            # Page 4 – projets (prendre directement candidate.projects)
            extra_ctx["projects_data"] = cand.get("projects") or []

            # Page 5 – expériences (timeline)
            extra_ctx["experience_timeline"] = cand.get("experiences") or []

            # Page 6 – learning & growth
            lg = cand.get("learning_growth") or {}
            extra_ctx["learning_trainings"] = lg.get("certifications", []) or lg.get("self_learning", []) or []
            extra_ctx["learning_certs"] = lg.get("certifications", [])

            # Page 7 – readiness score + détails dimensions
            readiness = cand.get("readiness_score") or {}
            readiness_score = readiness.get("global_score")
            extra_ctx["readiness_score"] = readiness_score

            score_details = cand.get("score_details") or {}
            dims = []
            if score_details:
                # mapping dimension clé -> label FR
                labels = {
                    "hard_skills": "Compétences techniques",
                    "soft_skills": "Comportemental",
                    "autonomy": "Autonomie / Cohérence",
                    "learning_ability": "Différenciation / Apprentissage",
                    "professional_behavior": "Stabilité / Comportement pro",
                }
                for key, label in labels.items():
                    val = score_details.get(key) or score_details.get(key + "_depth")
                    if val is None:
                        continue
                    try:
                        pct = float(val)
                    except Exception:
                        continue
                    dims.append((label, "", pct))
            extra_ctx["score_dims"] = dims

        print("✅ Données transformées pour le template")
        
        # 3. Sélectionner le template selon la version
        if version == "one-page":
            template_name = "template_one_page2.html"
        elif version == "long":
            template_name = "portfolio_long_template.html"
        else:
            return False, None, f"Version inconnue: {version}. Utilisez 'one-page' ou 'long'"
        
        # 4. Charger le template (pour "long", privilégier long_template_path si fourni = même fichier que la vue)
        if version == "long" and long_template_path and os.path.isfile(long_template_path):
            template_path = long_template_path
            print(f"✅ Template long explicite utilisé: {template_path}")
        else:
            template_path = get_template_path(template_name)
        
        if not template_path:
            return False, None, f"Template introuvable: {template_name}"
        
        print(f"✅ Template trouvé: {template_path}")
        
        # 5. Lire le template
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # 6. URL de base pour les assets (images de fond) — le HTML est servi sans chemin de fichier
        assets_base_url = (flask_base_url or "http://localhost:5002").rstrip("/") + "/portfolio/static/"
        # 7. Rendre le template avec Jinja2
        try:
            jinja_template = Template(template_content)
            ctx = {
                "candidate": template_data.get("candidate", {}),
                "portfolio": template_data.get("portfolio", {}),
                "candidate_id": candidate_id,
                "assets_base_url": assets_base_url,
                "portfolio_lang": lang,
            }
            if version == "long":
                ctx.update(extra_ctx)
            html_content = jinja_template.render(**ctx)
            print(f"✅ Template rendu avec succès (version: {version})")
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
    lang: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Sauvegarde le HTML généré uniquement dans Supabase Storage.
    MinIO n'est plus utilisé.

    Args:
        html_content: Contenu HTML généré
        candidate_id: ID du candidat
        candidate_uuid: UUID du candidat
        version: Version du portfolio ("one-page" ou "long")
        lang: Langue du portfolio ("fr" ou "en"). Si fourni, le fichier est sauvegardé avec ce suffixe.

    Returns:
        Tuple (success, url, error_message) où url est le chemin logique (object_name)
    """
    try:
        from candidate_minio_path import get_candidate_minio_prefix
        from supabase_storage import get_supabase_storage

        storage = get_supabase_storage()
        if not storage or not storage.client:
            return False, None, "Supabase Storage non initialisé"

        minio_prefix = get_candidate_minio_prefix(candidate_id)
        if lang and lang in ("fr", "en"):
            object_name = f"{minio_prefix}portfolio_TAP_{version}_{lang}.html"
        else:
            object_name = f"{minio_prefix}portfolio_TAP_{version}.html"

        html_bytes = html_content.encode("utf-8")

        success, url, error = storage.upload_file(
            html_bytes,
            object_name,
            content_type="text/html; charset=utf-8",
        )
        if not success:
            return False, None, f"Erreur upload HTML vers Supabase Storage: {error}"

        print(f"✅ Portfolio HTML sauvegardé dans Supabase Storage: {object_name}")
        return True, url, None

    except Exception as e:
        error_msg = f"Erreur lors de la sauvegarde du portfolio HTML: {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return False, None, error_msg


def generate_and_save_portfolio_html(
    candidate_id: int,
    candidate_uuid: str,
    version: str = "one-page",
    candidate_image_url: Optional[str] = None,
    candidate_email: Optional[str] = None,
    candidate_phone: Optional[str] = None,
    candidate_job_title: Optional[str] = None,
    candidate_years_experience: Optional[int] = None,
    save_to_minio: bool = True,
    lang: str = "fr"
) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
    """
    Génère et sauvegarde le portfolio HTML en une seule opération.
    
    Args:
        candidate_id: ID du candidat en base de données
        candidate_uuid: UUID du candidat
        version: Version du portfolio ("one-page" ou "long")
        candidate_image_url: URL de l'image du candidat (optionnel)
        candidate_email: Email du candidat (optionnel)
        candidate_phone: Téléphone du candidat (optionnel)
        candidate_job_title: Titre du poste (optionnel)
        candidate_years_experience: Années d'expérience (optionnel)
        save_to_minio: Si True, sauvegarde dans MinIO
    
    Returns:
        Tuple (success, html_content, minio_url, error_message)
    """
    lang = (lang or "fr").lower() if lang else "fr"
    if lang not in ("fr", "en"):
        lang = "fr"

    # Générer le HTML
    success, html_content, error = generate_portfolio_html(
        candidate_id=candidate_id,
        version=version,
        candidate_image_url=candidate_image_url,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone,
        candidate_job_title=candidate_job_title,
        candidate_years_experience=candidate_years_experience,
        candidate_uuid=candidate_uuid,
        lang=lang
    )
    
    if not success:
        return False, None, None, error
    
    # Sauvegarder dans MinIO si demandé
    minio_url = None
    if save_to_minio:
        save_success, minio_url, save_error = save_portfolio_html(
            html_content,
            candidate_id,
            candidate_uuid,
            version,
            lang=lang
        )
        
        if not save_success:
            print(f"⚠️  Erreur lors de la sauvegarde dans MinIO: {save_error}")
            # On retourne quand même le HTML même si la sauvegarde a échoué
    
    return True, html_content, minio_url, None
