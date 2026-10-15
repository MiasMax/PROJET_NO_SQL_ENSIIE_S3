"""
User domain entity representing marketplace members and administrators.
"""

from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass
class User:
    id: str
    username: str
    name: str
    role: str
    balance: float
    is_admin: bool
    created_at: datetime

    @classmethod
    def create(
        cls,
        username: str,
        name: str,
        role: str = "Dresseur",
        balance: float = 100.0,
        is_admin: bool = False,
        user_id: str | None = None,
    ) -> "User":
        return cls(
            id=user_id or username.lower().strip().replace(" ", "_"),
            username=username.strip(),
            name=name.strip(),
            role=role.strip(),
            balance=max(0.0, round(balance, 2)),
            is_admin=is_admin,
            created_at=datetime.now(UTC),
        )
