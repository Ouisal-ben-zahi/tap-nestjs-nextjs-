"""
Service d'embeddings sémantiques (sentence-transformers).
Convertit texte, offre ou profil candidat en vecteur pour similarité cosine.
"""
import json
import os
from typing import Any, Dict, List, Optional, Union

import numpy as np
from supabase_db import supabase_db
from A4.agent.config import EMBEDDING_MODEL


def _extract_item_name(x: Any) -> str:
    """Extrait un libelle depuis un item str/dict (name/nom/label/skill)."""
    if isinstance(x, str):
        return x.strip()
    if isinstance(x, dict):
        return str(
            x.get("name")
            or x.get("nom")
            or x.get("label")
            or x.get("skill")
            or x.get("skill_name")
            or ""
        ).strip()
    return ""


def _get_model():
    """Charge le modèle sentence-transformers (lazy)."""
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(EMBEDDING_MODEL)
    except ImportError:
        return None


class EmbeddingService:
    """
    Embeddings pour jobs et candidats.
    Stocke les vecteurs candidats en base (table candidate_embeddings).
    """

    def __init__(self, model_name: Optional[str] = None):
        self._model = None
        self._model_name = model_name or EMBEDDING_MODEL

    @property
    def model(self):
        if self._model is None:
            self._model = _get_model()
        return self._model

    def embed_text(self, text: str) -> Optional[List[float]]:
        """Encode un texte en vecteur. Retourne liste de floats (JSON-serializable)."""
        if not text or not text.strip():
            return None
        if self.model is None:
            return None
        try:
            vec = self.model.encode(text.strip(), convert_to_numpy=True)
            return vec.tolist()
        except Exception:
            return None

    def embed_texts(self, texts: List[str]) -> Optional[np.ndarray]:
        """Encode une liste de textes (batch). Retourne array (n, dim)."""
        texts = [t.strip() for t in texts if t and str(t).strip()]
        if not texts or self.model is None:
            return None
        try:
            return self.model.encode(texts, convert_to_numpy=True)
        except Exception:
            return None

    def _job_to_text(self, row: Dict[str, Any]) -> str:
        """Construit un bloc texte représentant l'offre pour l'embedding."""
        parts = []
        if row.get("title"):
            parts.append(str(row["title"]))
        if row.get("reason"):
            parts.append(str(row["reason"]))
        if row.get("main_mission"):
            parts.append(str(row["main_mission"]))
        if row.get("skills"):
            s = row["skills"]
            if isinstance(s, str):
                try:
                    s = json.loads(s)
                except Exception:
                    s = []
            if isinstance(s, list):
                for x in s:
                    if isinstance(x, dict) and x.get("name"):
                        parts.append(x["name"])
                    elif isinstance(x, str):
                        parts.append(x)
        if row.get("languages"):
            lang = row["languages"]
            if isinstance(lang, str):
                try:
                    lang = json.loads(lang)
                except Exception:
                    lang = []
            if isinstance(lang, list):
                for x in lang:
                    if isinstance(x, dict) and x.get("name"):
                        parts.append(x["name"])
                    elif isinstance(x, str):
                        parts.append(x)
        return " ".join(parts) if parts else ""

    def embed_job(self, job_id: int) -> Optional[List[float]]:
        """Charge l'offre en base et retourne son vecteur."""
        if supabase_db is None:
            return None
        try:
            resp = (
                supabase_db.table("jobs")
                .select("title, reason, main_mission, skills, languages")
                .eq("id", job_id)
                .limit(1)
                .execute()
            )
            row = resp.data[0] if resp.data else None
        except Exception:
            row = None
        if not row:
            return None
        text = self._job_to_text(row)
        return self.embed_text(text)

    def _candidate_to_text(self, row: Dict[str, Any], skills_csv: str = "", languages_csv: str = "") -> str:
        """Construit un bloc texte représentant le candidat pour l'embedding."""
        parts = []
        if row.get("titre_profil"):
            parts.append(str(row["titre_profil"]))
        if row.get("resume_bref"):
            parts.append(str(row["resume_bref"]))
        if skills_csv:
            parts.append(skills_csv.replace(",", " "))
        if languages_csv:
            parts.append(languages_csv.replace(",", " "))
        return " ".join(parts) if parts else ""

    def embed_candidate_from_row(self, row: Dict[str, Any], skills_csv: str = "", languages_csv: str = "") -> Optional[List[float]]:
        """Produit le vecteur d'un candidat à partir d'une ligne déjà chargée."""
        text = self._candidate_to_text(row, skills_csv, languages_csv)
        return self.embed_text(text)

    def get_candidate_embedding(self, candidate_id: int) -> Optional[List[float]]:
        """
        Récupère le vecteur candidat depuis la table candidate_embeddings.
        Retourne None si absent ou modèle différent.
        """
        if supabase_db is None:
            return None
        try:
            resp = (
                supabase_db.table("candidate_embeddings")
                .select("embedding, model_version")
                .eq("candidate_id", candidate_id)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            r = resp.data[0] if resp.data else None
        except Exception:
            r = None
        if not r:
            return None
        model_version = r.get("model_version")
        if model_version != self._model_name:
            return None
        emb = r.get("embedding")
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except Exception:
                return None
        return emb if isinstance(emb, list) else None

    def set_candidate_embedding(self, candidate_id: int, embedding: List[float]) -> bool:
        """Enregistre ou met à jour le vecteur d'un candidat."""
        if supabase_db is None:
            return False
        emb_json = json.dumps(embedding)
        try:
            supabase_db.table("candidate_embeddings").upsert(
                {
                    "candidate_id": candidate_id,
                    "embedding": emb_json,
                    "model_version": self._model_name,
                },
                on_conflict="candidate_id",
            ).execute()
            return True
        except Exception:
            return False

    def embed_candidate(self, candidate_id: int, store: bool = True) -> Optional[List[float]]:
        """
        Vecteur du candidat : depuis le cache (candidate_embeddings) ou calcul + stockage.
        """
        cached = self.get_candidate_embedding(candidate_id)
        if cached is not None:
            return cached
        # Charger candidat (+ éventuels champs skills/languages s'ils sont présents dans la table)
        if supabase_db is None:
            return None
        try:
            resp = (
                supabase_db.table("candidates")
                .select(
                    "id, titre_profil, resume_bref, skills, languages"
                )
                .eq("id", candidate_id)
                .limit(1)
                .execute()
            )
            row = resp.data[0] if resp.data else None
        except Exception as e:
            # Schéma legacy: colonne `langues` au lieu de `languages`.
            if "column candidates.languages does not exist" in str(e):
                try:
                    resp = (
                        supabase_db.table("candidates")
                        .select("id, titre_profil, resume_bref, skills, langues")
                        .eq("id", candidate_id)
                        .limit(1)
                        .execute()
                    )
                    row = resp.data[0] if resp.data else None
                except Exception:
                    row = None
            else:
                row = None
        if not row:
            return None
        skills_csv = ""
        languages_csv = ""
        if row.get("skills"):
            skills_val = row["skills"]
            if isinstance(skills_val, str):
                try:
                    skills_val = json.loads(skills_val)
                except Exception:
                    skills_val = [s.strip() for s in skills_val.split(",") if s and s.strip()]
            if isinstance(skills_val, list):
                skills_csv = ",".join([n for n in [_extract_item_name(x) for x in skills_val] if n])
        lang_source = row.get("languages") if row.get("languages") is not None else row.get("langues")
        if lang_source:
            lang_val = lang_source
            if isinstance(lang_val, str):
                try:
                    lang_val = json.loads(lang_val)
                except Exception:
                    lang_val = [s.strip() for s in lang_val.split(",") if s and s.strip()]
            if isinstance(lang_val, list):
                languages_csv = ",".join([n for n in [_extract_item_name(x) for x in lang_val] if n])
        emb = self.embed_candidate_from_row(row, skills_csv, languages_csv)
        if emb and store:
            self.set_candidate_embedding(candidate_id, emb)
        return emb

    def cosine_similarity(self, a: Union[List[float], np.ndarray], b: Union[List[float], np.ndarray]) -> float:
        """Similarité cosine entre deux vecteurs."""
        from sklearn.metrics.pairwise import cosine_similarity as sk_cos
        a = np.array(a).reshape(1, -1) if not isinstance(a, np.ndarray) else a.reshape(1, -1)
        b = np.array(b).reshape(1, -1) if not isinstance(b, np.ndarray) else b.reshape(1, -1)
        return float(sk_cos(a, b)[0, 0])
