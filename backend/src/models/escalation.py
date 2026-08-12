from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import random
import string


def generate_reference_id() -> str:
    """Generate a unique human-readable reference ID.
    Avoids visually/phonetically confusing characters like 0, 1, O, I.
    """
    chars = string.ascii_uppercase + string.digits
    chars = "".join([c for c in chars if c not in "01OI"])
    return "ESC-" + "".join(random.choices(chars, k=6))


class Escalation:
    def __init__(
        self,
        *,
        user_id: str,
        problem_summary: str,
        checks_performed: str,
        urgency: str,
        language: str,
        preferred_follow_up: str,
        status: str = "open",
        timestamp: datetime | None = None,
        id: str | None = None,
    ) -> None:
        self.id = id or generate_reference_id()
        self.user_id = user_id
        self.problem_summary = problem_summary
        self.checks_performed = checks_performed
        self.urgency = urgency
        self.language = language
        self.preferred_follow_up = preferred_follow_up
        self.status = status
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "userId": self.user_id,
            "problemSummary": self.problem_summary,
            "checksPerformed": self.checks_performed,
            "urgency": self.urgency,
            "language": self.language,
            "preferredFollowUp": self.preferred_follow_up,
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
        }
