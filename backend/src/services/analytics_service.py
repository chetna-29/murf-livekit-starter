import os
import sqlite3
import uuid
from datetime import datetime, timezone

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "aarogyam_memory.db")
)


class AnalyticsService:
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
                CREATE TABLE IF NOT EXISTS call_analytics (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    ended_at TEXT NOT NULL,
                    duration_seconds REAL NOT NULL,
                    channel TEXT NOT NULL,
                    language TEXT NOT NULL,
                    outcome TEXT NOT NULL,
                    failure_reason TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.commit()

    @classmethod
    def save_call_analytics(
        cls,
        session_id: str,
        started_at: datetime,
        ended_at: datetime,
        duration_seconds: float,
        channel: str,
        language: str,
        outcome: str,
        failure_reason: str | None = None,
    ) -> str:
        cls.initialize_db()
        record_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        with cls.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO call_analytics (
                    id, session_id, started_at, ended_at, duration_seconds,
                    channel, language, outcome, failure_reason, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record_id,
                    session_id,
                    started_at.isoformat(),
                    ended_at.isoformat(),
                    duration_seconds,
                    channel,
                    language,
                    outcome,
                    failure_reason,
                    created_at,
                ),
            )
            conn.commit()
        return record_id

    @classmethod
    def get_analytics_summary(cls, filters: dict = None) -> dict:
        cls.initialize_db()
        if filters is None:
            filters = {}

        query_parts = ["1=1"]
        params = []

        if filters.get("language"):
            query_parts.append("language = ?")
            params.append(filters["language"])

        if filters.get("channel"):
            query_parts.append("channel = ?")
            params.append(filters["channel"].lower())

        if filters.get("outcome"):
            query_parts.append("outcome = ?")
            params.append(filters["outcome"].lower())

        if filters.get("date_from"):
            query_parts.append("started_at >= ?")
            params.append(filters["date_from"])

        if filters.get("date_to"):
            query_parts.append("started_at <= ?")
            params.append(filters["date_to"])

        where_clause = " AND ".join(query_parts)

        with cls.get_connection() as conn:
            # 1. Total, successful, failed calls
            counts = conn.execute(
                f"""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN outcome = 'successful' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) as failed
                FROM call_analytics
                WHERE {where_clause}
                """,
                params,
            ).fetchone()

            total = counts["total"] or 0
            successful = counts["successful"] or 0
            failed = counts["failed"] or 0
            success_rate = (successful / total * 100) if total > 0 else 0.0

            # 2. Languages distribution
            lang_rows = conn.execute(
                f"""
                SELECT language, COUNT(*) as count
                FROM call_analytics
                WHERE {where_clause}
                GROUP BY language
                """,
                params,
            ).fetchall()
            calls_by_language = {row["language"]: row["count"] for row in lang_rows}

            # 3. Channels distribution
            chan_rows = conn.execute(
                f"""
                SELECT channel, COUNT(*) as count
                FROM call_analytics
                WHERE {where_clause}
                GROUP BY channel
                """,
                params,
            ).fetchall()
            calls_by_channel = {row["channel"]: row["count"] for row in chan_rows}

            # 4. Calls over time (grouped by date)
            time_rows = conn.execute(
                f"""
                SELECT SUBSTR(started_at, 1, 10) as date,
                       SUM(CASE WHEN outcome = 'successful' THEN 1 ELSE 0 END) as successful,
                       SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) as failed
                FROM call_analytics
                WHERE {where_clause}
                GROUP BY date
                ORDER BY date ASC
                """,
                params,
            ).fetchall()
            calls_over_time = [
                {
                    "date": row["date"],
                    "successful": row["successful"],
                    "failed": row["failed"],
                }
                for row in time_rows
            ]

            # 5. Recent calls (safe fields only)
            recent_rows = conn.execute(
                f"""
                SELECT started_at, duration_seconds, channel, language, outcome
                FROM call_analytics
                WHERE {where_clause}
                ORDER BY started_at DESC
                LIMIT 50
                """,
                params,
            ).fetchall()
            recent_calls = [
                {
                    "started_at": row["started_at"],
                    "duration_seconds": row["duration_seconds"],
                    "channel": row["channel"],
                    "language": row["language"],
                    "outcome": row["outcome"],
                }
                for row in recent_rows
            ]

        return {
            "total_calls": total,
            "successful_calls": successful,
            "failed_calls": failed,
            "success_rate": round(success_rate, 1),
            "calls_by_language": calls_by_language,
            "calls_by_channel": calls_by_channel,
            "calls_over_time": calls_over_time,
            "recent_calls": recent_calls,
        }
