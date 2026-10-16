"""
User repository interface.
Authoritative document store contract for user accounts (e.g. MongoDB).
"""

from abc import ABC, abstractmethod

from app.domain.entities.user import User


class UserRepository(ABC):
    @abstractmethod
    async def save(self, user: User) -> None:
        """Persist a new user account or update an existing one."""
        pass

    @abstractmethod
    async def get_by_id(self, user_id: str) -> User | None:
        """Fetch user by unique identifier."""
        pass

    @abstractmethod
    async def get_by_username(self, username: str) -> User | None:
        """Fetch user by username."""
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Fetch user by email address."""
        pass

    @abstractmethod
    async def list_users(self, limit: int = 50, skip: int = 0) -> list[User]:
        """List registered users with pagination."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Count total registered users."""
        pass
