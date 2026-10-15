"""
Objets-valeurs pour l'état d'usure des cartes (standard international TCG / Cardmarket).
"""

from enum import StrEnum


class CardCondition(StrEnum):
    MINT = "MINT"  # Parfait état, sortie de booster sous sleeve
    NEAR_MINT = "NEAR_MINT"  # Quasi neuf, infimes micro-défauts
    EXCELLENT = "EXCELLENT"  # Très bon état, légers blanchiments aux bords
    GOOD = "GOOD"  # Bon état, quelques rayures ou marques d'usage
    PLAYED = "PLAYED"  # Jouée, plis ou usure visible
