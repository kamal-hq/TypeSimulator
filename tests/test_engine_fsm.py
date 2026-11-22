"""Deterministic FSM, concurrency, abort latency, and Focus Guard tests."""

from __future__ import annotations

import random
import threading
import time

from backend.cadence import CadenceGenerator
from backend.engine import TypingEngine
from backend.models import EngineSnapshot, TypingConfig


class FakeKeyboard:
    """In-memory keyboard sink simulating an editor buffer (with Backspace support)."""

    def __init__(self) -> None:
        self.events: list[str] = []
        self.buffer: list[str] = []
        self.enter_shifts: list[bool] = []
        self.lock = threading.Lock()

    def type_char(self, char: str) -> None:
        with self.lock:
            self.events.append(char)
            self.buffer.append(char)

    def press_enter(self, shift: bool = False) -> None:
        with self.lock:
            self.events.append("SHIFT+ENTER" if shift else "ENTER")
            self.enter_shifts.append(shift)
            self.buffer.append("\n")

    def press_tab(self) -> None:
        with self.lock:
            self.events.append("TAB")
            self.buffer.append("\t")

    def press_backspace(self) -> None:
        with self.lock:
            self.events.append("BACKSPACE")
            if self.buffer:
                self.buffer.pop()

    @property
    def text(self) -> str:
        with self.lock:
            return "".join(self.buffer)


class FakeWindowMonitor:
    def __init__(self, hwnd: int = 1001, title: str = "Chrome — Portal") -> None:
        self.hwnd = hwnd
        self.title = title

    def get_active_window(self) -> tuple[int, str]:
        return (self.hwnd, self.title)

    def is_elevated(self) -> bool:
        return False


class FastCadence(CadenceGenerator):
    def __init__(self, delay: float = 0.002, rng: random.Random | None = None) -> None:
        super().__init__(rng=rng or random.Random(1))
        self._delay = delay

    def compute_delay(self, char: str, prev_char: str | None, config: TypingConfig) -> float:
        return self._delay

    def typo_reaction_delay(self) -> float:
        return 0.001

    def typo_recovery_delay(self) -> float:
        return 0.001


def _wait_for_state(engine: TypingEngine, target: str, timeout: float = 2.0) -> EngineSnapshot:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        snap = engine.get_snapshot()
        if snap.state == target:
            return snap
        time.sleep(0.005)
    raise AssertionError(f"Timed out waiting for state {target}; actual={engine.get_snapshot().state}")


def test_full_typing_run_and_control_keys():
    kb = FakeKeyboard()
    monitor = FakeWindowMonitor()
    cfg = TypingConfig(
        countdown=0,
        typos_enabled=False,
        newlines="shift-enter",
        tabs="send-tab",
    )
    engine = TypingEngine(keyboard=kb, window_monitor=monitor, cadence=FastCadence(), config=cfg)
    try:
        engine.start("Line 1\n\tLine 2")
        snap = _wait_for_state(engine, "COMPLETED")
        assert kb.text == "Line 1\n\tLine 2"
        assert kb.enter_shifts == [True]
        assert "TAB" in kb.events
        assert snap.cursor == snap.total
        assert snap.target_window_title == "Chrome — Portal"
    finally:
        engine.shutdown()


def test_double_start_cannot_spawn_concurrent_workers():
    kb = FakeKeyboard()
    monitor = FakeWindowMonitor()
    cfg = TypingConfig(countdown=0, typos_enabled=False)
    engine = TypingEngine(keyboard=kb, window_monitor=monitor, cadence=FastCadence(0.004), config=cfg)
    try:
        payload = "No interleaved duplicates!"
        engine.start(payload)
        engine.start(payload)  # Must be ignored while TYPING
        _wait_for_state(engine, "COMPLETED")
        assert kb.text == payload
    finally:
        engine.shutdown()


def test_non_destructive_pause_and_resume_preserves_cursor():
    kb = FakeKeyboard()
    monitor = FakeWindowMonitor()
    cfg = TypingConfig(countdown=0, typos_enabled=False)
    engine = TypingEngine(keyboard=kb, window_monitor=monitor, cadence=FastCadence(0.015), config=cfg)
    try:
        payload = "Pause halfway and resume cleanly without losing a single character."
        engine.start(payload)

        # Wait until some characters have been typed
        deadline = time.monotonic() + 1.5
        while time.monotonic() < deadline and engine.get_snapshot().cursor < 8:
            time.sleep(0.005)

        paused = engine.pause("User pause")
        assert paused.state == "PAUSED"
        assert 0 < paused.cursor < len(payload)
        assert paused.pause_reason == "User pause"

        engine.resume(skip_countdown=True)
        done = _wait_for_state(engine, "COMPLETED")
        assert kb.text == payload
        assert done.cursor == len(payload)
    finally:
        engine.shutdown()


def test_abort_cancels_countdown_with_low_latency():
    kb = FakeKeyboard()
    monitor = FakeWindowMonitor()
    cfg = TypingConfig(countdown=5, typos_enabled=False)
    engine = TypingEngine(keyboard=kb, window_monitor=monitor, cadence=FastCadence(), config=cfg)
    try:
        engine.start("Should never type this")
        assert engine.get_snapshot().state == "COUNTDOWN"

        t0 = time.monotonic()
        aborted = engine.abort()
        elapsed = time.monotonic() - t0

        assert aborted.state == "ABORTED"
        assert elapsed < 0.15
        time.sleep(0.05)
        assert kb.text == ""
    finally:
        engine.shutdown()


def test_focus_guard_auto_pauses_before_typing_into_wrong_window():
    kb = FakeKeyboard()
    monitor = FakeWindowMonitor(hwnd=1001, title="Target Browser")
    cfg = TypingConfig(countdown=0, typos_enabled=False, focus_guard=True)
    engine = TypingEngine(keyboard=kb, window_monitor=monitor, cadence=FastCadence(0.015), config=cfg)
    try:
        payload = "Confidential payload that must stay inside Target Browser only."
        engine.start(payload)

        deadline = time.monotonic() + 1.5
        while time.monotonic() < deadline and engine.get_snapshot().cursor < 5:
            time.sleep(0.005)

        # Simulate another app stealing foreground focus
        monitor.hwnd = 2002
        monitor.title = "Slack — #general"

        paused = _wait_for_state(engine, "PAUSED")
        assert paused.pause_reason is not None
        assert "Slack — #general" in paused.pause_reason
        assert paused.cursor < len(payload)
        stopped_len = len(kb.text)

        # Confirm zero characters leak after auto-pause
        time.sleep(0.06)
        assert len(kb.text) == stopped_len
    finally:
        engine.shutdown()


def test_typo_simulator_corrects_mistakes_and_yields_exact_text():
    kb = FakeKeyboard()
    monitor = FakeWindowMonitor()
    cfg = TypingConfig(countdown=0, typos_enabled=True, error_rate=8)
    # Seed RNG with high typo rate override via custom cadence
    class GuaranteedTypoCadence(FastCadence):
        def maybe_typo(self, char: str, config: TypingConfig) -> str | None:
            if char == "e":
                return "r"
            return None

    engine = TypingEngine(keyboard=kb, window_monitor=monitor, cadence=GuaranteedTypoCadence(), config=cfg)
    try:
        engine.start("keep")
        snap = _wait_for_state(engine, "COMPLETED")
        assert kb.text == "keep"
        assert snap.typo_corrections == 2
        assert kb.events.count("BACKSPACE") == 2
    finally:
        engine.shutdown()
