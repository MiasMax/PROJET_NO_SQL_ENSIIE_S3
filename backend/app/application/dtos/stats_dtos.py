"""
Schémas DTO pour le bilan Admin et les métriques NoSQL.
"""
from pydantic import BaseModel
from typing import Dict, Any, List


class TerminalCommandInfo(BaseModel):
    system: str
    command: str
    description: str


class AdminStatsResponse(BaseModel):
    summary: Dict[str, Any]
    systems: Dict[str, Any]
    consistency_check: Dict[str, Any]
    terminal_commands: List[TerminalCommandInfo]
