import json
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


_SESSIONS_DIR = os.path.join("/tmp", "tap_portfolio_sessions")


def _ensure_dir():
    try:
        os.makedirs(_SESSIONS_DIR, exist_ok=True)
    except Exception:
        pass


def _session_path(session_id: str) -> str:
    return os.path.join(_SESSIONS_DIR, f"{session_id}.json")


@dataclass
class PortfolioSession:
    candidate_id: int
    extracted_data: Dict[str, Any] = field(default_factory=dict)
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    # Questions/answers flow
    questions: List[Dict[str, Any]] = field(default_factory=list)
    answers: Dict[str, str] = field(default_factory=dict)
    current_question_key: Optional[str] = None
    current_question: Optional[str] = None
    is_complete: bool = False

    # Extra state for UI
    profile: Dict[str, Any] = field(default_factory=dict)
    missing_fields: List[str] = field(default_factory=list)

    @classmethod
    def create(cls, candidate_id: int, extracted_data: Optional[Dict[str, Any]] = None) -> "PortfolioSession":
        _ensure_dir()
        s = cls(candidate_id=candidate_id, extracted_data=extracted_data or {})
        s._persist()
        return s

    @classmethod
    def load(cls, session_id: str) -> Optional["PortfolioSession"]:
        _ensure_dir()
        path = _session_path(session_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            s = cls(
                candidate_id=int(data.get("candidate_id")),
                extracted_data=data.get("extracted_data") or {},
                session_id=data.get("session_id") or session_id,
            )
            s.questions = data.get("questions") or []
            s.answers = data.get("answers") or {}
            s.current_question_key = data.get("current_question_key")
            s.current_question = data.get("current_question")
            s.is_complete = bool(data.get("is_complete"))
            s.profile = data.get("profile") or {}
            s.missing_fields = data.get("missing_fields") or []
            return s
        except Exception:
            return None

    def set_current_question(self, key: Optional[str], text: Optional[str]):
        self.current_question_key = key
        self.current_question = text
        self._persist()

    def update_profile(self, extracted: Dict[str, Any]):
        # Keep as free-form profile, used mainly for UI preview
        try:
            self.profile.update(extracted or {})
        except Exception:
            pass
        self._persist()

    def add_answer(self, question_id: str, answer: str):
        self.answers[str(question_id)] = str(answer)
        self._persist()

    def set_questions(self, questions: List[Dict[str, Any]]):
        self.questions = questions or []
        self.missing_fields = [q.get("id") for q in self.questions if q.get("id")]  # remaining question ids
        self._persist()

    def mark_filled(self, question_id: Optional[str]):
        if not question_id:
            return
        qid = str(question_id)
        self.missing_fields = [x for x in (self.missing_fields or []) if str(x) != qid]
        self._persist()

    def mark_complete(self):
        self.is_complete = True
        self.current_question_key = None
        self.current_question = None
        self.missing_fields = []
        self._persist()

    def get_state(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "candidate_id": self.candidate_id,
            "is_complete": self.is_complete,
            "profile": self.profile,
            "missing_fields": self.missing_fields,
            "current_question_key": self.current_question_key,
            "current_question": self.current_question,
            "questions": self.questions,
            "answers": self.answers,
            "extracted_data": self.extracted_data,
        }

    def _persist(self):
        _ensure_dir()
        try:
            with open(_session_path(self.session_id), "w", encoding="utf-8") as f:
                json.dump(self.get_state(), f, ensure_ascii=False, indent=2)
        except Exception:
            # best-effort persistence
            pass

