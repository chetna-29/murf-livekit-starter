import os
import sqlite3
from datetime import datetime, timezone

try:
    from models.escalation import Escalation
except ImportError:
    from ..models.escalation import Escalation

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "aarogyam_memory.db")
)


class EscalationService:
    @staticmethod
    def get_connection():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def initialize_db(cls):
        with cls.get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS escalations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    problem_summary TEXT NOT NULL,
                    checks_performed TEXT NOT NULL,
                    urgency TEXT NOT NULL,
                    language TEXT NOT NULL,
                    preferred_follow_up TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL
                );
                """
            )
            conn.commit()

    @classmethod
    def create_escalation_record(cls, escalation: Escalation) -> None:
        cls.initialize_db()
        with cls.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO escalations (
                    id, user_id, problem_summary, checks_performed, urgency, language, preferred_follow_up, timestamp, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    escalation.id,
                    escalation.user_id,
                    escalation.problem_summary,
                    escalation.checks_performed,
                    escalation.urgency,
                    escalation.language,
                    escalation.preferred_follow_up,
                    escalation.timestamp.isoformat(),
                    escalation.status,
                ),
            )
            conn.commit()

    @classmethod
    def get_escalation(cls, escalation_id: str) -> Escalation | None:
        cls.initialize_db()
        with cls.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM escalations WHERE id = ?",
                (escalation_id,),
            ).fetchone()
            if row:
                return Escalation(
                    id=row["id"],
                    user_id=row["user_id"],
                    problem_summary=row["problem_summary"],
                    checks_performed=row["checks_performed"],
                    urgency=row["urgency"],
                    language=row["language"],
                    preferred_follow_up=row["preferred_follow_up"],
                    status=row["status"],
                    timestamp=datetime.fromisoformat(row["timestamp"]),
                )
        return None
