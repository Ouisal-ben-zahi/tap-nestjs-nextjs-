from typing import Any, Dict, List, Optional, Tuple

from supabase_db import supabase_db
from supabase_storage import get_supabase_storage
from candidate_minio_path import get_candidate_minio_prefix

from B2.chat.pose_question import generate_questions_with_gemini
from B2.chat.save_responses import save_chat_responses_to_minio


def _get_candidate_uuid(candidate_id: int) -> Optional[str]:
    if supabase_db is None:
        return None
    try:
        resp = (
            supabase_db.table("candidates")
            .select("candidate_uuid, id_agent")
            .eq("id", int(candidate_id))
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return None
        row = rows[0] or {}
        return row.get("candidate_uuid") or row.get("id_agent")
    except Exception:
        return None


def _load_talentcard_json(candidate_id: int) -> Optional[Dict[str, Any]]:
    candidate_uuid = _get_candidate_uuid(candidate_id)
    if not candidate_uuid:
        return None

    storage = get_supabase_storage()
    if not storage or not storage.client:
        return None

    prefix = get_candidate_minio_prefix(int(candidate_id))
    object_name = f"{prefix}talentcard_TAP.json"

    ok, file_bytes, _err = storage.download_file(object_name)
    if not ok or not file_bytes:
        return None
    try:
        import json

        return json.loads(file_bytes.decode("utf-8"))
    except Exception:
        return None


class QuestionLogic:
    @staticmethod
    def ensure_questions(session) -> List[Dict[str, Any]]:
        if session.questions:
            return session.questions

        # Try to load profile data from talentcard json
        talentcard = _load_talentcard_json(int(session.candidate_id))
        profile_data = talentcard or (session.extracted_data or {})

        res = generate_questions_with_gemini(profile_data, talentcard_data=talentcard)
        if not res.get("success"):
            # fallback: one soft skills question only
            questions = [
                {
                    "id": "soft_skills_8_examples",
                    "text": "Pour la section Soft Skills de ton portfolio, liste 8 soft skills que tu maîtrises et pour chacune donne un exemple concret (situation vécue, action, résultat ou preuve).",
                }
            ]
        else:
            questions = res.get("questions") or []

        session.set_questions(questions)
        return questions

    @staticmethod
    def get_next_question(session) -> Optional[Tuple[str, str]]:
        questions = QuestionLogic.ensure_questions(session)
        answers = session.answers or {}

        for q in questions:
            qid = q.get("id")
            if not qid:
                continue
            if str(qid) not in answers:
                text = q.get("text") or ""
                return str(qid), str(text)

        # No more questions => complete session and persist chat_responses.json
        try:
            save_chat_responses_to_minio(
                int(session.candidate_id),
                questions=questions,
                answers=answers,
                projects_list=[],
            )
        except Exception:
            pass
        session.mark_complete()
        return None

    @staticmethod
    def extract_answer(current_question_key: str, user_message: str) -> Dict[str, Any]:
        # Keep it simple: store raw answer; downstream parsers can extract URLs/tech, etc.
        return {str(current_question_key): str(user_message)}

