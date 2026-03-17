"""
Justification automatique du classement par un LLM.
Produit pour chaque candidat : score sur 100, forces, manques, explication.
"""
import json
import os
from typing import Any, Dict, List, Optional

from supabase_db import supabase_db

from A4.agent.config import GEMINI_MODEL


def _load_job_summary(job_id: int) -> str:
    """Résumé texte de l'offre pour le LLM."""
    if supabase_db is None:
        return ""
    try:
        resp = (
            supabase_db.table("jobs")
            .select(
                "title, reason, main_mission, skills, niveau_attendu, experience_min, disponibilite"
            )
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
    except Exception as e:
        print(f"⚠️  Erreur chargement job pour justification (Supabase): {e}")
        row = None
    if not row:
        return ""
    parts = [f"Poste: {row.get('title') or 'N/A'}"]
    if row.get("main_mission"):
        parts.append(f"Mission: {row['main_mission'][:500]}")
    if row.get("reason"):
        parts.append(f"Contexte: {row['reason'][:300]}")
    if row.get("skills"):
        s = row["skills"]
        if isinstance(s, str):
            try:
                s = json.loads(s)
            except Exception:
                s = []
        if isinstance(s, list):
            names = []
            for x in s:
                if isinstance(x, dict) and x.get("name"):
                    names.append(x["name"])
                elif isinstance(x, str):
                    names.append(x)
            if names:
                parts.append("Compétences: " + ", ".join(names[:15]))
    if row.get("niveau_attendu"):
        parts.append(f"Niveau: {row['niveau_attendu']}")
    if row.get("experience_min"):
        parts.append(f"Expérience min: {row['experience_min']}")
    if row.get("disponibilite"):
        parts.append(f"Disponibilité: {row['disponibilite']}")
    return "\n".join(parts)


def _load_candidate_summary(candidate_id: int) -> str:
    """Résumé texte du profil candidat pour le LLM."""
    if supabase_db is None:
        return ""
    try:
        resp = (
            supabase_db.table("candidates")
            .select(
                "id, titre_profil, resume_bref, annees_experience, niveau_seniorite, "
                "disponibilite, skills_csv, languages_csv, skills, languages"
            )
            .eq("id", candidate_id)
            .limit(1)
            .execute()
        )
        row = resp.data[0] if resp.data else None
    except Exception as e:
        print(f"⚠️  Erreur chargement candidat pour justification (Supabase): {e}")
        row = None
    if not row:
        return ""
    parts = [f"Profil: {row.get('titre_profil') or 'N/A'}"]
    if row.get("resume_bref"):
        parts.append(f"Résumé: {row['resume_bref'][:400]}")
    skills_csv = (row.get("skills_csv") or "").strip()
    languages_csv = (row.get("languages_csv") or "").strip()
    # Fallback depuis skills / languages JSON si les colonnes *_csv ne sont pas renseignées
    if not skills_csv and row.get("skills"):
        skills_val = row["skills"]
        if isinstance(skills_val, str):
            try:
                skills_val = json.loads(skills_val)
            except Exception:
                skills_val = []
        if isinstance(skills_val, list):
            skills_csv = ",".join(
                str(x.get("name") if isinstance(x, dict) else x) for x in skills_val
            )
    if not languages_csv and row.get("languages"):
        lang_val = row["languages"]
        if isinstance(lang_val, str):
            try:
                lang_val = json.loads(lang_val)
            except Exception:
                lang_val = []
        if isinstance(lang_val, list):
            languages_csv = ",".join(
                str(x.get("name") if isinstance(x, dict) else x) for x in lang_val
            )

    if skills_csv:
        parts.append("Compétences: " + skills_csv.replace(",", ", ")[:400])
    if languages_csv:
        parts.append("Langues: " + languages_csv.replace(",", ", "))
    if row.get("annees_experience") is not None:
        parts.append(f"Expérience: {row['annees_experience']} an(s)")
    if row.get("niveau_seniorite"):
        parts.append(f"Niveau: {row['niveau_seniorite']}")
    if row.get("disponibilite"):
        parts.append(f"Disponibilité: {row['disponibilite']}")
    return "\n".join(parts)


def _call_llm(prompt: str) -> Optional[str]:
    """Appel Gemini (JSON)."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=1024,
                response_mime_type="application/json",
            ),
        )
        response = model.generate_content(prompt)
        if response and response.candidates and response.candidates[0].content.parts:
            return response.candidates[0].content.parts[0].text
        return response.text if response else None
    except Exception:
        return None


def _parse_justification(raw: Optional[str]) -> Dict[str, Any]:
    """Parse la réponse JSON du LLM en structure fixe."""
    default = {
        "score_100": 50,
        "strengths": [],
        "weaknesses": [],
        "explanation": "Justification non disponible.",
    }
    if not raw or not raw.strip():
        return default
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        data = json.loads(raw)
        return {
            "score_100": int(data.get("score_100", 50)) if isinstance(data.get("score_100"), (int, float)) else 50,
            "strengths": data.get("strengths") if isinstance(data.get("strengths"), list) else [],
            "weaknesses": data.get("weaknesses") if isinstance(data.get("weaknesses"), list) else [],
            "explanation": str(data.get("explanation", ""))[:1000] or default["explanation"],
        }
    except Exception:
        return default


class JustificationService:
    """
    Génère une justification structurée (score /100, forces, manques, explication)
    pour un candidat par rapport à une offre, via LLM.
    """

    def explain_one(
        self,
        job_id: int,
        candidate_id: int,
        job_summary: Optional[str] = None,
        candidate_summary: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retourne { score_100, strengths, weaknesses, explanation } pour ce candidat / cette offre.
        """
        job_text = job_summary or _load_job_summary(job_id)
        cand_text = candidate_summary or _load_candidate_summary(candidate_id)
        prompt = f"""Tu es un expert RH. Pour l'offre et le profil candidat ci-dessous, fournis une évaluation structurée.

OFFRE D'EMPLOI:
{job_text}

PROFIL CANDIDAT:
{cand_text}

Réponds en JSON exactement avec cette structure (pas d'autre texte):
{{
  "score_100": <nombre entre 0 et 100>,
  "strengths": [<liste de 2 à 5 forces principales du candidat pour ce poste>],
  "weaknesses": [<liste de 0 à 3 manques ou points d'attention>],
  "explanation": "<en 1 à 3 phrases, la raison du classement et de ce score>"
}}
"""
        raw = _call_llm(prompt)
        return _parse_justification(raw)

    def explain_batch(
        self,
        job_id: int,
        match_results: List[Dict[str, Any]],
        with_explanation: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Pour chaque entrée de match_results (qui doit contenir candidate_id),
        ajoute score_100, strengths, weaknesses, explanation si with_explanation=True.
        """
        job_summary = _load_job_summary(job_id)
        out = []
        for r in list(match_results):
            entry = dict(r)
            if with_explanation:
                expl = self.explain_one(
                    job_id,
                    entry["candidate_id"],
                    job_summary=job_summary,
                    candidate_summary=_load_candidate_summary(entry["candidate_id"]),
                )
                entry["score_100"] = expl["score_100"]
                entry["strengths"] = expl["strengths"]
                entry["weaknesses"] = expl["weaknesses"]
                entry["explanation"] = expl["explanation"]
            else:
                entry.setdefault("score_100", int(entry.get("score", 0) * 100))
                entry.setdefault("strengths", [])
                entry.setdefault("weaknesses", [])
                entry.setdefault("explanation", "")
            out.append(entry)
        return out
