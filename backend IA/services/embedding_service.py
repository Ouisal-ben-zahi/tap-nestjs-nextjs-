import json
import os
from typing import Iterable, List, Optional

import numpy as np

try:
    from google import genai
    from google.genai import types  # ✅ AJOUT : import types pour EmbedContentConfig
except ImportError:
    genai = None
    types = None

# ✅ CORRECTION : nom du modèle correct
_GEMINI_MODEL_NAME = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2-preview")
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

_GENAI_CLIENT: Optional["genai.Client"] = None


def _get_genai_client():
    global _GENAI_CLIENT
    if _GENAI_CLIENT is not None:
        return _GENAI_CLIENT
    if genai is None:
        print("⚠️ [embedding_service] google-genai n'est pas installé.")
        return None
    if not _GEMINI_API_KEY:
        print("⚠️ [embedding_service] GEMINI_API_KEY manquante.")
        return None
    try:
        _GENAI_CLIENT = genai.Client(api_key=_GEMINI_API_KEY)
        return _GENAI_CLIENT
    except Exception as e:
        print(f"⚠️ [embedding_service] Erreur création client Gemini: {e}")
        _GENAI_CLIENT = None
        return None


def _to_serializable_vector(vec: Iterable[float]) -> List[float]:
    return [float(x) for x in vec]


def parse_embedding(value) -> Optional[List[float]]:
    if value is None:
        return None
    try:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            parsed = json.loads(value)
        else:
            parsed = value
        if isinstance(parsed, (list, tuple)):
            return [float(x) for x in parsed]
    except Exception as e:
        print(f"⚠️ [embedding_service] Impossible de parser l'embedding: {e}")
    return None


def generer_embedding(texte: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[List[float]]:
    # ✅ AJOUT : paramètre task_type flexible
    # Utilise RETRIEVAL_DOCUMENT pour les offres/profils stockés
    # Utilise RETRIEVAL_QUERY pour la recherche en temps réel
    if not texte or not str(texte).strip():
        return None

    client = _get_genai_client()
    if client is None:
        return None

    try:
        # ✅ CORRECTION : utiliser types.EmbedContentConfig au lieu d'un dict brut
        response = client.models.embed_content(
            model=_GEMINI_MODEL_NAME,
            contents=str(texte),
            config=types.EmbedContentConfig(task_type=task_type),
        )

        embedding = None
        try:
            if hasattr(response, "embeddings") and response.embeddings:
                embedding = getattr(response.embeddings[0], "values", None)
        except Exception:
            embedding = None

        if not embedding:
            print("⚠️ [embedding_service] Réponse d'embedding vide.")
            return None
        return _to_serializable_vector(embedding)

    except Exception as e:
        print(f"⚠️ [embedding_service] Erreur lors de la génération d'embedding: {e}")
        return None


# ✅ AJOUT : fonction dédiée pour la recherche (query)
def generer_embedding_query(texte: str) -> Optional[List[float]]:
    """
    À utiliser quand le candidat cherche des offres (côté requête).
    """
    return generer_embedding(texte, task_type="RETRIEVAL_QUERY")


def calculer_similarite(e1: Iterable[float], e2: Iterable[float]) -> Optional[float]:
    try:
        v1 = np.array(list(e1), dtype="float32")
        v2 = np.array(list(e2), dtype="float32")
        if v1.size == 0 or v2.size == 0 or v1.shape != v2.shape:
            return None
        n1 = np.linalg.norm(v1)
        n2 = np.linalg.norm(v2)
        if n1 == 0.0 or n2 == 0.0:
            return None
        sim = float(np.dot(v1, v2) / (n1 * n2))
        return max(-1.0, min(1.0, sim))  # ✅ SIMPLIFICATION du clamp
    except Exception as e:
        print(f"⚠️ [embedding_service] Erreur calcul similarité: {e}")
        return None


def embedding_to_json(vec: Optional[Iterable[float]]) -> Optional[str]:
    if vec is None:
        return None
    try:
        return json.dumps(_to_serializable_vector(vec))
    except Exception as e:
        print(f"⚠️ [embedding_service] Erreur sérialisation embedding: {e}")
        return None