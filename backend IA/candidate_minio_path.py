"""
Préfixe de stockage par candidat : candidates/{categorie_profil}/{candidate_id}/
Permet de diviser les dossiers par profil (dev, data, design, video, etc.).
Compatible avec Supabase Storage (chemins d'objets).
"""
from typing import Optional

from supabase_db import supabase_db


def normalize_categorie_profil(value: Optional[str]) -> str:
    """
    Retourne la catégorie telle qu'elle est fournie (sans normalisation).
    Fallback: "autre" si la valeur est vide.
    """
    if not value or not str(value).strip():
        return "autre"
    return str(value).strip()


def get_candidate_minio_prefix(candidate_id: int, categorie_profil: Optional[str] = None) -> str:
    """
    Construit le préfixe de stockage pour un candidat.
    Utilise Supabase (table candidates) si possible, sinon fallback sur "autre".
    """
    if categorie_profil is not None:
        cat = normalize_categorie_profil(categorie_profil)
        return f"candidates/{cat}/{int(candidate_id)}/"

    # Essayer de récupérer categorie_profil depuis Supabase
    try:
        if supabase_db is not None:
            resp = (
                supabase_db.table("candidates")
                .select("categorie_profil")
                .eq("id", int(candidate_id))
                .limit(1)
                .execute()
            )
            row = resp.data[0] if resp.data else None
            cat_value = (row or {}).get("categorie_profil") if row else None
            cat = normalize_categorie_profil(cat_value)
            return f"candidates/{cat}/{int(candidate_id)}/"
    except Exception:
        pass

    # Fallback robuste
    return f"candidates/autre/{int(candidate_id)}/"
