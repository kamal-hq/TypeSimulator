"""Thread-safe FSM typing engine with zero-latency abort, pause/resume, and Focus Guard."""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Callable, Optional, Protocol

from backend.cadence import CadenceGenerator
from backend.focus_guard import Win32WindowMonitor, WindowMonitor
from backend.models import EngineSnapshot, EngineState, TypingConfig
from backend.sanitizer import sanitize_text


class KeyboardDriver(Protocol):
    def type_char(self, char: str) -> None: ...
    def press_enter(self, shift: bool = False) -> None: ...
    def press_tab(self) -> None: ...
    def press_backspace(self) -> None: ...


class PynputKeyboardDriver:
    """Real OS-level keystroke injector using pynput.keyboard.Controller."""

    def __init__(self) -> None:
        from pynput.keyboard import Controller, Key

        self._controller = Controller()
        self._key = Key

    def type_char(self, char: str) -> None:
        self._controller.type(char)

    def press_enter(self, shift: bool = False) -> None:
        if shift:
            with self._controller.pressed(self._key.shift):
                self._controller.tap(self._key.enter)
        else:
            self._controller.tap(self._key.enter)

    def press_tab(self) -> None:
        self._controller.tap(self._key.tab)

    def press_backspace(self) -> None:
        self._controller.tap(self._key.backspace)


SnapshotListener = Callable[[EngineSnapshot], None]


class TypingEngine:
    """Lock-protected FSM orchestrating countdown, humanized typing, pause/resume & Focus Guard."""

    def __init__(
        self,
        keyboard: Optional[KeyboardDriver] = None,
        window_monitor: Optional[WindowMonitor] = None,
        cadence: Optional[CadenceGenerator] = None,
        config: Optional[TypingConfig] = None,
        emit_interval_sec: float = 0.065,
    ) -> None:
        self._lock = threading.RLock()
        self._keyboard = keyboard or PynputKeyboardDriver()
        self._window_monitor = window_monitor or Win32WindowMonitor()
        self._cadence = cadence or CadenceGenerator()
        self._config = config or TypingConfig()
        self._emit_interval = emit_interval_sec

        self._state: EngineState = "IDLE"
        self._source: str = ""
        self._cursor: int = 0
        self._typo_corrections: int = 0
        self._countdown_remaining: int = 0
        self._live_wpm: int = 0
        self._pause_reason: Optional[str] = None
        self._target_hwnd: int = 0
        self._target_title: Optional[str] = None
        self._wpm_history: deque[int] = deque(maxlen=20)
        self._char_timestamps: deque[float] = deque(maxlen=12)

        self._run_token: int = 0
        self._interrupt_event = threading.Event()
        self._worker: Optional[threading.Thread] = None
        self._listeners: list[SnapshotListener] = []
        self._last_emit_ts: float = 0.0

    # --- Subscription & Inspection ---

    def subscribe(self, listener: SnapshotListener) -> Callable[[], None]:
        with self._lock:
            self._listeners.append(listener)
            snap = self._build_snapshot_locked()
        listener(snap)

        def _unsubscribe() -> None:
            with self._lock:
                if listener in self._listeners:
                    self._listeners.remove(listener)

        return _unsubscribe

    @property
    def config(self) -> TypingConfig:
        with self._lock:
            return TypingConfig.from_dict(self._config.to_dict())

    def update_config(self, patch: dict) -> TypingConfig:
        with self._lock:
            self._config = self._config.merged_with(patch)
            return TypingConfig.from_dict(self._config.to_dict())

    def get_snapshot(self) -> EngineSnapshot:
        with self._lock:
            return self._build_snapshot_locked()

    # --- State Transitions ---

    def start(self, raw_text: str, skip_countdown: bool = False) -> EngineSnapshot:
        """Start a fresh typing run from cursor 0 (rejects concurrent starts)."""
        with self._lock:
            if self._state in ("COUNTDOWN", "TYPING"):
                return self._build_snapshot_locked()

            sanitized = sanitize_text(raw_text, self._config).sanitized
            if not sanitized:
                return self._build_snapshot_locked()

            self._source = sanitized
            self._cursor = 0
            self._typo_corrections = 0
            self._pause_reason = None
            self._live_wpm = 0
            self._wpm_history.clear()
            self._char_timestamps.clear()

            countdown = 0 if skip_countdown else self._config.countdown
            self._launch_worker_locked(countdown_seconds=countdown)
            snap = self._build_snapshot_locked()
        self._emit(snap, force=True)
        return snap

    def resume(self, skip_countdown: bool = False) -> EngineSnapshot:
        """Resume non-destructively from saved cursor position."""
        with self._lock:
            if self._state != "PAUSED":
                return self._build_snapshot_locked()
            if self._cursor >= len(self._source):
                self._state = "COMPLETED"
                self._pause_reason = None
                snap = self._build_snapshot_locked()
            else:
                self._pause_reason = None
                # Give user a short window to refocus target if triggered via UI button
                countdown = 0 if skip_countdown else min(self._config.countdown, 2)
                self._launch_worker_locked(countdown_seconds=countdown)
                snap = self._build_snapshot_locked()
        self._emit(snap, force=True)
        return snap

    def start_or_resume(self, raw_text: str, from_hotkey: bool = False) -> EngineSnapshot:
        """Convenience handler for Start/Resume hotkey (`F9`)."""
        with self._lock:
            if self._state == "PAUSED":
                return self.resume(skip_countdown=from_hotkey)
            if self._state in ("COUNTDOWN", "TYPING"):
                return self._build_snapshot_locked()
        # Global hotkey starts with user's configured countdown (or 0 if configured 0)
        return self.start(raw_text, skip_countdown=False)

    def pause(self, reason: str = "Paused manually") -> EngineSnapshot:
        with self._lock:
            if self._state not in ("COUNTDOWN", "TYPING"):
                return self._build_snapshot_locked()
            self._run_token += 1
            self._interrupt_event.set()
            self._state = "PAUSED"
            self._countdown_remaining = 0
            self._live_wpm = 0
            self._pause_reason = reason
            snap = self._build_snapshot_locked()
        self._emit(snap, force=True)
        return snap

    def abort(self) -> EngineSnapshot:
        """Stop immediately without wiping staged source text."""
        with self._lock:
            if self._state not in ("COUNTDOWN", "TYPING", "PAUSED"):
                return self._build_snapshot_locked()
            self._run_token += 1
            self._interrupt_event.set()
            self._state = "ABORTED"
            self._countdown_remaining = 0
            self._live_wpm = 0
            self._pause_reason = None
            snap = self._build_snapshot_locked()
        self._emit(snap, force=True)
        return snap

    def reset(self) -> EngineSnapshot:
        with self._lock:
            self._run_token += 1
            self._interrupt_event.set()
            self._state = "IDLE"
            self._cursor = 0
            self._typo_corrections = 0
            self._countdown_remaining = 0
            self._live_wpm = 0
            self._pause_reason = None
            self._target_hwnd = 0
            self._target_title = None
            self._wpm_history.clear()
            self._char_timestamps.clear()
            snap = self._build_snapshot_locked()
        self._emit(snap, force=True)
        return snap

    def shutdown(self) -> None:
        with self._lock:
            self._run_token += 1
            self._interrupt_event.set()
            worker = self._worker
        if worker and worker.is_alive():
            worker.join(timeout=0.5)

    # --- Internal Worker ---

    def _launch_worker_locked(self, countdown_seconds: int) -> None:
        self._run_token += 1
        token = self._run_token
        self._interrupt_event = threading.Event()
        interrupt = self._interrupt_event

        if countdown_seconds > 0:
            self._state = "COUNTDOWN"
            self._countdown_remaining = countdown_seconds
        else:
            self._state = "TYPING"
            self._countdown_remaining = 0

        worker = threading.Thread(
            target=self._run_loop,
            args=(token, interrupt, countdown_seconds),
            name=f"TypeSimulatorWorker-{token}",
            daemon=True,
        )
        self._worker = worker
        worker.start()

    def _is_active_token(self, token: int) -> bool:
        with self._lock:
            return self._run_token == token

    def _run_loop(self, token: int, interrupt: threading.Event, countdown_seconds: int) -> None:
        # Phase A: Countdown (zero-latency interrupt via Event.wait)
        remaining = countdown_seconds
        while remaining > 0:
            if interrupt.wait(1.0) or not self._is_active_token(token):
                return
            remaining -= 1
            with self._lock:
                if self._run_token != token:
                    return
                self._countdown_remaining = remaining
                if remaining > 0:
                    snap = self._build_snapshot_locked()
                else:
                    snap = None
            if snap is not None:
                self._emit(snap, force=True)

        # Phase B: Lock onto active foreground window for Focus Guard
        hwnd, title = self._window_monitor.get_active_window()
        with self._lock:
            if self._run_token != token:
                return
            self._state = "TYPING"
            self._countdown_remaining = 0
            self._target_hwnd = hwnd
            self._target_title = title or None
            self._char_timestamps.clear()
            snap = self._build_snapshot_locked()
        self._emit(snap, force=True)

        # Phase C: Keystroke loop
        prev_char: Optional[str] = None
        while True:
            with self._lock:
                if self._run_token != token or self._state != "TYPING":
                    return
                if self._cursor >= len(self._source):
                    self._state = "COMPLETED"
                    self._live_wpm = 0
                    done_snap = self._build_snapshot_locked()
                    self._emit(done_snap, force=True)
                    return

                char = self._source[self._cursor]
                cfg = self._config
                expected_hwnd = self._target_hwnd

            # Active-Window Focus Guard check BEFORE injecting keystroke
            if cfg.focus_guard and expected_hwnd != 0:
                cur_hwnd, cur_title = self._window_monitor.get_active_window()
                if cur_hwnd != expected_hwnd:
                    switched_name = cur_title or "another application"
                    self.pause(f"Focus switched to {switched_name}")
                    return

            # Optional QWERTY typo + backspace correction
            wrong_char = self._cadence.maybe_typo(char, cfg)
            if wrong_char is not None:
                if interrupt.is_set() or not self._is_active_token(token):
                    return
                self._keyboard.type_char(wrong_char)
                if interrupt.wait(self._cadence.typo_reaction_delay()) or not self._is_active_token(token):
                    return
                self._keyboard.press_backspace()
                with self._lock:
                    if self._run_token != token:
                        return
                    self._typo_corrections += 1
                if interrupt.wait(self._cadence.typo_recovery_delay()) or not self._is_active_token(token):
                    return

            # Final interrupt check right before sending intended character
            if interrupt.is_set() or not self._is_active_token(token):
                return

            self._inject_character(char, cfg)

            now = time.monotonic()
            with self._lock:
                if self._run_token != token:
                    return
                self._cursor += 1
                self._char_timestamps.append(now)
                self._live_wpm = self._compute_live_wpm_locked(cfg.target_wpm)
                self._wpm_history.append(self._live_wpm)
                is_done = self._cursor >= len(self._source)
                if is_done:
                    self._state = "COMPLETED"
                    self._live_wpm = 0
                progress_snap = self._build_snapshot_locked()

            self._emit(progress_snap, force=is_done)
            if is_done:
                return

            delay = self._cadence.compute_delay(char, prev_char, cfg)
            prev_char = char
            if interrupt.wait(delay) or not self._is_active_token(token):
                return

    def _inject_character(self, char: str, cfg: TypingConfig) -> None:
        if char == "\n":
            self._keyboard.press_enter(shift=(cfg.newlines == "shift-enter"))
        elif char == "\t":
            self._keyboard.press_tab()
        else:
            self._keyboard.type_char(char)

    def _compute_live_wpm_locked(self, fallback_wpm: int) -> int:
        if len(self._char_timestamps) < 2:
            return fallback_wpm
        elapsed = self._char_timestamps[-1] - self._char_timestamps[0]
        if elapsed <= 0.01:
            return fallback_wpm
        chars = len(self._char_timestamps) - 1
        wpm = int(round((chars / 5.0) / (elapsed / 60.0)))
        return max(15, min(240, wpm))

    def _build_snapshot_locked(self) -> EngineSnapshot:
        total = len(self._source)
        remaining = max(0, total - self._cursor)
        eta = (
            self._cadence.estimate_eta_seconds(remaining, self._config.target_wpm)
            if self._state in ("COUNTDOWN", "TYPING", "PAUSED")
            else 0
        )
        return EngineSnapshot(
            state=self._state,
            cursor=self._cursor,
            total=total,
            output="",
            live_wpm=self._live_wpm,
            eta_seconds=eta,
            countdown_remaining=self._countdown_remaining,
            typo_corrections=self._typo_corrections,
            pause_reason=self._pause_reason,
            target_window_title=self._target_title,
            wpm_history=list(self._wpm_history),
        )

    def _emit(self, snapshot: EngineSnapshot, force: bool = False) -> None:
        now = time.monotonic()
        with self._lock:
            if not force and (now - self._last_emit_ts) < self._emit_interval:
                return
            self._last_emit_ts = now
            listeners = list(self._listeners)
        for listener in listeners:
            try:
                listener(snapshot)
            except Exception:
                pass
