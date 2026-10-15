"""
Data transfer objects for admin metrics and status checks.
"""

from typing import Any

from pydantic import BaseModel


class TerminalCommandInfo(BaseModel):
    system: str
    command: str
    description: str


class AdminStatsResponse(BaseModel):
    summary: dict[str, Any]
    systems: dict[str, Any]
    consistency_check: dict[str, Any]
    terminal_commands: list[TerminalCommandInfo]
