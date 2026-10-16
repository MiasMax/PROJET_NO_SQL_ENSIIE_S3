"""
User domain entity representing marketplace members and administrators.
"""

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


def hash_password(password: str, salt: str | None = None) -> str:
    """Hash password with PBKDF2-HMAC-SHA256."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return f"{salt}${hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify plain password against PBKDF2 hash."""
    if not stored_hash:
        return True
    if "$" not in stored_hash:
        return False
    salt, hashed = stored_hash.split("$", 1)
    test_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return hmac.compare_digest(hashed, test_hash)


@dataclass
class User:
    id: str
    username: str
    name: str
    email: str
    password_hash: str
    role: str
    balance: float
    is_admin: bool
    created_at: datetime

    @classmethod
    def create(
        cls,
        username: str,
        name: str,
        email: str = "",
        password: str = "",
        role: str = "Dresseur",
        balance: float = 100.0,
        is_admin: bool = False,
        user_id: str | None = None,
        created_at: datetime | None = None,
    ) -> "User":
        pwd_hash = hash_password(password) if password else ""
        clean_user_id = user_id or username.lower().strip().replace(" ", "_")
        return cls(
            id=clean_user_id,
            username=username.strip(),
            name=name.strip(),
            email=email.strip().lower(),
            password_hash=pwd_hash,
            role=role.strip() or "Dresseur",
            balance=max(0.0, round(balance, 2)),
            is_admin=is_admin,
            created_at=created_at or datetime.now(UTC),
        )

    def check_password(self, password: str) -> bool:
        return verify_password(password, self.password_hash)

    def credit_balance(self, amount: float) -> float:
        self.balance = round(self.balance + max(0.0, amount), 2)
        return self.balance

    def debit_balance(self, amount: float) -> float:
        if self.balance < amount:
            raise ValueError(
                f"Solde insuffisant: solde actuel de {self.balance:.2f} €, montant requis {amount:.2f} €"
            )
        self.balance = round(self.balance - amount, 2)
        return self.balance

    def to_dict(self, include_private: bool = False) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "balance": self.balance,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat()
            if hasattr(self.created_at, "isoformat")
            else str(self.created_at),
        }
        if include_private:
            data["password_hash"] = self.password_hash
        return data
