"""
Value objects for card condition (TCG / Cardmarket grading standard).
"""

from enum import StrEnum


class CardCondition(StrEnum):
    MINT = "MINT"  # Pack-fresh, sleeved immediately
    NEAR_MINT = "NEAR_MINT"  # Minimal edge whitening or micro-flaws
    EXCELLENT = "EXCELLENT"  # Light play, minor border wear
    GOOD = "GOOD"  # Noticeable wear, minor scratches or scuffs
    PLAYED = "PLAYED"  # Heavy play, visible bends or edge wear
