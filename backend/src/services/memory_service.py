import os
import json
import sqlite3
from datetime import datetime, timezone
from dataclasses import dataclass

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "aarogyam_memory.db")
)


@dataclass
class CallerRecord:
    user_id: str
    name: str
    language_preference: str
    facts: list[str]
    last_interaction: str


class MemoryService:
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
                CREATE TABLE IF NOT EXISTS caller_records (
                    user_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    language_preference TEXT NOT NULL,
                    facts TEXT NOT NULL,
                    last_interaction TEXT NOT NULL
                );
                """
            )
            conn.commit()

    @classmethod
    def get_caller(cls, user_id: str) -> CallerRecord | None:
        cls.initialize_db()
        normalized_id = user_id.strip().lower()
        with cls.get_connection() as conn:
            row = conn.execute(
                """
                SELECT user_id, name, language_preference, facts, last_interaction
                FROM caller_records WHERE LOWER(user_id) = ?
                """,
                (normalized_id,),
            ).fetchone()
            if row:
                try:
                    facts = json.loads(row["facts"])
                except Exception:
                    facts = []
                return CallerRecord(
                    user_id=row["user_id"],
                    name=row["name"],
                    language_preference=row["language_preference"],
                    facts=facts,
                    last_interaction=row["last_interaction"],
                )
        return None

    @classmethod
    def save_caller(
        cls, user_id: str, name: str, language_preference: str, facts: list[str]
    ) -> None:
        cls.initialize_db()
        normalized_id = user_id.strip().lower()
        last_interaction = datetime.now(timezone.utc).isoformat()
        facts_json = json.dumps(facts)
        with cls.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO caller_records (user_id, name, language_preference, facts, last_interaction)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    name=excluded.name,
                    language_preference=excluded.language_preference,
                    facts=excluded.facts,
                    last_interaction=excluded.last_interaction
                """,
                (
                    normalized_id,
                    name,
                    language_preference,
                    facts_json,
                    last_interaction,
                ),
            )
            conn.commit()
