"""
Pipeline de matching sémantique :
  1) Filtrage minimal (domaine, optionnel: compétences critiques)
  2) Similarité vectorielle (cosine)
  3) Classement par score décroissant
  4) Top N
  5) Optionnel : re-ranking avec feedback (bonus/pénalité)
"""
from typing import Any, Dict, List, Optional, Tuple

from supabase_db import supabase_db

from A4.agent.config import DEFAULT_TOP_N, MIN_SIMILARITY_THRESHOLD
from A4.agent.embeddings import EmbeddingService
from A4.agent.feedback import FeedbackStore
from candidate_minio_path import normalize_categorie_profil


def _load_job_domaine(job_id: int) -> Optional[str]:
    """Retourne le domaine de l'offre (pour filtrer les candidats). Gère l'absence de colonne."""
    if supabase_db is None:
        return None
    try:
        resp = (
            supabase_db.table("jobs")
            .select("domaine_activite, categorie_profil")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
    except Exception as e:
        print(f"⚠️  Erreur chargement domaine job (Supabase): {e}")
        row = None
    if not row:
        return None
    # Priorité à categorie_profil (domaine exact) puis domaine_activite
    v = (row.get("categorie_profil") or row.get("domaine_activite") or "").strip()
    return v if v else None


def _load_candidate_ids_for_domaine(domaine_activite: Optional[str]) -> List[int]:
    """Liste des id candidats du domaine (categorie_profil)."""
    if supabase_db is None:
        return []
    categorie = normalize_categorie_profil(domaine_activite or "") if domaine_activite else None
    try:
        query = supabase_db.table("candidates").select("id")
        if categorie:
            query = query.eq("categorie_profil", categorie)
        resp = query.order("id").execute()
        rows = resp.data or []
    except Exception as e:
        print(f"⚠️  Erreur chargement candidats pour domaine (Supabase): {e}")
        rows = []
    return [r.get("id") for r in rows if r.get("id") is not None]


class MatchingPipeline:
    """
    Pipeline : filtre → embeddings → similarité cosine → tri → top N → (feedback).
    """

    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        feedback_store: Optional[FeedbackStore] = None,
        min_similarity: float = MIN_SIMILARITY_THRESHOLD,
    ):
        self.embedding = embedding_service or EmbeddingService()
        self.feedback = feedback_store or FeedbackStore()
        self.min_similarity = min_similarity

    def run(
        self,
        job_id: int,
        top_n: int = DEFAULT_TOP_N,
        apply_feedback: bool = True,
        domaine_override: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Exécute le matching pour une offre.
        Retourne une liste de dicts : candidate_id, similarity_score, score (après feedback), candidate (snapshot optionnel).
        """
        # Étape 1 : Filtrage minimal (domaine)
        domaine = domaine_override or _load_job_domaine(job_id)
        candidate_ids = _load_candidate_ids_for_domaine(domaine)
        if not candidate_ids:
            return []

        # Étape 2 : Similarité vectorielle
        job_emb = self.embedding.embed_job(job_id)
        if job_emb is None:
            return []

        scored: List[Tuple[int, float]] = []
        for cid in candidate_ids:
            cand_emb = self.embedding.embed_candidate(cid, store=True)
            if cand_emb is None:
                continue
            sim = self.embedding.cosine_similarity(job_emb, cand_emb)
            if sim >= self.min_similarity:
                scored.append((cid, sim))

        # Étape 3 & 4 : Tri décroissant et Top N
        scored.sort(key=lambda x: -x[1])
        top = scored[:top_n]
        original_scores = {cid: s for cid, s in top}

        # Étape 5 : Re-ranking avec feedback (bonus/pénalité)
        if apply_feedback and self.feedback:
            top = self.feedback.apply_feedback_to_ranking(job_id, top)

        return [
            {
                "candidate_id": cid,
                "similarity_score": round(original_scores.get(cid, adj), 4),
                "score": round(adj, 4),
                "rank": i + 1,
            }
            for i, (cid, adj) in enumerate(top)
        ]
