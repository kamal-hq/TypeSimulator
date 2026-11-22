"""Biomechanical typing cadence model and QWERTY adjacent-key typo generator."""

from __future__ import annotations

import math
import random
from typing import Optional

from backend.models import TypingConfig

CADENCE_PRESETS: dict[str, dict[str, int]] = {
    "Natural": {"targetWpm": 68, "variability": 34},
    "Fast": {"targetWpm": 105, "variability": 24},
    "Thoughtful": {"targetWpm": 48, "variability": 58},
    "Steady": {"targetWpm": 75, "variability": 10},
}

# Physical QWERTY keyboard neighbor map for realistic mistypes
QWERTY_NEIGHBORS: dict[str, str] = {
    "q": "wa",
    "w": "qesa",
    "e": "wsdr",
    "r": "edft",
    "t": "rfgy",
    "y": "tghu",
    "u": "yhji",
    "i": "ujko",
    "o": "iklp",
    "p": "ol",
    "a": "qwsz",
    "s": "qwedxza",
    "d": "werfcxs",
    "f": "ertgvcd",
    "g": "rtyhbvf",
    "h": "tyujnbg",
    "j": "yuikmnh",
    "k": "uiolm j".replace(" ", ""),
    "l": "iopk",
    "z": "asx",
    "x": "zsdc",
    "c": "xdfv",
    "v": "cfgb",
    "b": "vghn",
    "n": "bhjm",
    "m": "njk",
}

_SENTENCE_PUNCT = frozenset(".!?")
_CLAUSE_PUNCT = frozenset(",;:-")


class CadenceGenerator:
    """Computes realistic log-normal keystroke delays and QWERTY typos."""

    def __init__(self, rng: Optional[random.Random] = None) -> None:
        self._rng = rng or random.Random()

    def compute_delay(
        self,
        char: str,
        prev_char: Optional[str],
        config: TypingConfig,
    ) -> float:
        """Return realistic seconds to wait after/before typing `char`."""
        wpm = max(25, min(150, config.target_wpm))
        # Standard definition: 1 word = 5 characters -> chars/sec = (wpm * 5) / 60
        base_interval = 60.0 / (wpm * 5.0)

        # Log-normal dispersion scaled by variability (0..100%)
        sigma = 0.05 + (max(0, min(100, config.variability)) / 100.0) * 0.40
        # Mean-preserving lognormal: exp(mu + 0.5*sigma^2) = 1 => mu = -0.5*sigma^2
        mu = -0.5 * (sigma ** 2)
        factor = math.exp(self._rng.gauss(mu, sigma))
        factor = max(0.45, min(2.4, factor))

        delay = base_interval * factor

        # Contextual rhythm adjustments
        if char == "\n":
            delay *= self._rng.uniform(1.9, 3.2)
        elif char in _SENTENCE_PUNCT:
            delay *= self._rng.uniform(1.7, 2.9)
        elif char in _CLAUSE_PUNCT:
            delay *= self._rng.uniform(1.25, 1.95)
        elif char == " ":
            delay *= self._rng.uniform(1.12, 1.60)
        elif prev_char and prev_char.isalpha() and char.isalpha():
            # Word-interior burst acceleration
            delay *= self._rng.uniform(0.78, 1.08)

        return max(0.012, delay)

    def maybe_typo(self, char: str, config: TypingConfig) -> Optional[str]:
        """Possibly return an adjacent QWERTY mistype preserving original case."""
        if not config.typos_enabled or config.error_rate <= 0:
            return None
        lower = char.lower()
        neighbors = QWERTY_NEIGHBORS.get(lower)
        if not neighbors:
            return None
        if self._rng.random() >= (config.error_rate / 100.0):
            return None

        wrong = self._rng.choice(neighbors)
        return wrong.upper() if char.isupper() else wrong

    def typo_reaction_delay(self) -> float:
        """Brief cognitive delay before noticing a mistype and hitting Backspace."""
        return self._rng.uniform(0.12, 0.25)

    def typo_recovery_delay(self) -> float:
        """Brief motor recovery delay after Backspace before typing the right key."""
        return self._rng.uniform(0.05, 0.11)

    @staticmethod
    def estimate_eta_seconds(remaining_chars: int, target_wpm: int) -> int:
        if remaining_chars <= 0:
            return 0
        wpm = max(25, target_wpm)
        # Include ~12% average punctuation/pause overhead
        return max(1, int(math.ceil((remaining_chars / 5.0) / wpm * 60.0 * 1.12)))
