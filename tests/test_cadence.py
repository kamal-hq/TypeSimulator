"""Unit tests for backend.cadence."""

import random
import statistics

from backend.cadence import CadenceGenerator, QWERTY_NEIGHBORS
from backend.models import TypingConfig


def test_cadence_respects_wpm_speed_ordering():
    gen = CadenceGenerator(rng=random.Random(42))
    slow_cfg = TypingConfig(target_wpm=40, variability=20)
    fast_cfg = TypingConfig(target_wpm=120, variability=20)

    slow_mean = statistics.mean(gen.compute_delay("e", "t", slow_cfg) for _ in range(300))
    fast_mean = statistics.mean(gen.compute_delay("e", "t", fast_cfg) for _ in range(300))

    assert slow_mean > fast_mean * 2.0


def test_punctuation_and_newline_slower_than_word_burst():
    gen = CadenceGenerator(rng=random.Random(7))
    cfg = TypingConfig(target_wpm=70, variability=25)

    burst_mean = statistics.mean(gen.compute_delay("a", "b", cfg) for _ in range(250))
    punct_mean = statistics.mean(gen.compute_delay(".", "a", cfg) for _ in range(250))
    newline_mean = statistics.mean(gen.compute_delay("\n", ".", cfg) for _ in range(250))

    assert punct_mean > burst_mean * 1.5
    assert newline_mean > burst_mean * 1.7


def test_typo_generator_uses_qwerty_neighbors_and_preserves_case():
    gen = CadenceGenerator(rng=random.Random(99))
    always_typo_cfg = TypingConfig(typos_enabled=True, error_rate=100)
    no_typo_cfg = TypingConfig(typos_enabled=False, error_rate=100)

    assert gen.maybe_typo("e", no_typo_cfg) is None
    assert gen.maybe_typo("5", always_typo_cfg) is None

    lower_wrong = gen.maybe_typo("e", always_typo_cfg)
    upper_wrong = gen.maybe_typo("E", always_typo_cfg)

    assert lower_wrong is not None and lower_wrong.islower() and lower_wrong in QWERTY_NEIGHBORS["e"]
    assert upper_wrong is not None and upper_wrong.isupper() and upper_wrong.lower() in QWERTY_NEIGHBORS["e"]


def test_eta_estimate_scales_with_length_and_wpm():
    assert CadenceGenerator.estimate_eta_seconds(0, 70) == 0
    assert CadenceGenerator.estimate_eta_seconds(350, 70) >= 60
