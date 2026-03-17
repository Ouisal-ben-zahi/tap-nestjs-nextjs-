"""
Stockage des décisions recruteur (sélectionné / rejeté) et application
bonus / pénalité au classement (feedback learning).
"""
from typing import List, Optional, Tuple

from supabase_db import supabase_db

from A4.agent.config import (
    FEEDBACK_BONUS_SELECTED,
    FEEDBACK_PENALTY_REJECTED,
    FEEDBACK_MIN_DECISIONS,
)


class FeedbackStore:
    """
    Enregistre les décisions (selected / rejected) et applique un ajustement
    au score de similarité pour le re-ranking.
    """

    def __init__(
        self,
        bonus_selected: float = FEEDBACK_BONUS_SELECTED,
        penalty_rejected: float = FEEDBACK_PENALTY_REJECTED,
        min_decisions: int = FEEDBACK_MIN_DECISIONS,
    ):
        self.bonus_selected = bonus_selected
        self.penalty_rejected = penalty_rejected
        self.min_decisions = min_decisions

    def record(self, job_id: int, candidate_id: int, decision: str) -> bool:
        """
        Enregistre une décision du recruteur.
        decision: 'selected' | 'rejected'
        """
        if decision not in ("selected", "rejected"):
            return False
        if supabase_db is None:
            print("⚠️  Supabase DB non configurée, impossible d'enregistrer le feedback.")
            return False
        try:
            supabase_db.table("matching_feedback").insert(
                {
                    "job_id": job_id,
                    "candidate_id": candidate_id,
                    "decision": decision,
                }
            ).execute()
            return True
        except Exception as e:
            print(f"⚠️  Erreur insertion matching_feedback dans Supabase: {e}")
            return False

    def _get_candidate_feedback_stats(self, candidate_id: int) -> Tuple[int, int]:
        """Retourne (nb_selected, nb_rejected) pour ce candidat (historique global)."""
        if supabase_db is None:
            return 0, 0
        try:
            resp = (
                supabase_db.table("matching_feedback")
                .select("decision")
                .eq("candidate_id", candidate_id)
                .execute()
            )
            rows = resp.data or []
        except Exception as e:
            print(f"⚠️  Erreur lecture matching_feedback dans Supabase: {e}")
            rows = []
        selected = rejected = 0
        for r in rows:
            decision = r.get("decision")
            if decision == "selected":
                selected += 1
            elif decision == "rejected":
                rejected += 1
        return selected, rejected

    def apply_feedback_to_ranking(
        self,
        job_id: int,
        ranked: List[Tuple[int, float]],
    ) -> List[Tuple[int, float]]:
        """
        Ajuste les scores avec bonus (souvent sélectionné) / pénalité (souvent rejeté).
        ranked : liste de (candidate_id, similarity_score).
        Retourne liste de (candidate_id, adjusted_score), triée par score ajusté décroissant.
        """
        if not ranked:
            return []
        adjusted = []
        for cid, sim in ranked:
            sel, rej = self._get_candidate_feedback_stats(cid)
            total = sel + rej
            delta = 0.0
            if total >= self.min_decisions:
                if sel > rej:
                    delta = self.bonus_selected
                elif rej > sel:
                    delta = -self.penalty_rejected
            adjusted.append((cid, max(0.0, min(1.0, sim + delta))))
        adjusted.sort(key=lambda x: -x[1])
        return adjusted


def record_feedback(job_id: int, candidate_id: int, decision: str) -> bool:
    """Helper pour enregistrer un feedback depuis l'API."""
    return FeedbackStore().record(job_id, candidate_id, decision)
