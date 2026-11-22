"""Customizable global hotkey normalization and pynput listener lifecycle manager."""

from __future__ import annotations

import threading
from typing import Any, Callable, Optional

from backend.models import HotkeyBindings

_SPECIAL_KEY_MAP: dict[str, str] = {
    "ctrl": "<ctrl>",
    "control": "<ctrl>",
    "shift": "<shift>",
    "alt": "<alt>",
    "cmd": "<cmd>",
    "win": "<cmd>",
    "meta": "<cmd>",
    "esc": "<esc>",
    "escape": "<esc>",
    "enter": "<enter>",
    "return": "<enter>",
    "tab": "<tab>",
    "space": "<space>",
    "backspace": "<backspace>",
    "delete": "<delete>",
    "del": "<delete>",
    "home": "<home>",
    "end": "<end>",
    "pageup": "<page_up>",
    "pagedown": "<page_down>",
    "up": "<up>",
    "down": "<down>",
    "left": "<left>",
    "right": "<right>",
    "insert": "<insert>",
    "pause": "<pause>",
    **{f"f{i}": f"<f{i}>" for i in range(1, 25)},
}


def normalize_hotkey_to_pynput(hotkey: str) -> str:
    """Convert human-readable combo (e.g. 'Ctrl+Shift+Esc', 'F9') into pynput syntax."""
    raw = (hotkey or "").strip()
    if not raw:
        raise ValueError("Hotkey cannot be empty.")

    parts = [part.strip() for part in raw.split("+") if part.strip()]
    if not parts:
        raise ValueError(f"Invalid hotkey: {hotkey!r}")

    normalized: list[str] = []
    for part in parts:
        lower = part.lower()
        if lower in _SPECIAL_KEY_MAP:
            normalized.append(_SPECIAL_KEY_MAP[lower])
        elif len(part) == 1 and part.isprintable():
            normalized.append(lower)
        elif part.startswith("<") and part.endswith(">"):
            normalized.append(lower)
        else:
            raise ValueError(f"Unsupported key token {part!r} in hotkey {hotkey!r}")

    return "+".join(normalized)


def _default_listener_factory(mapping: dict[str, Callable[[], None]]) -> Any:
    from pynput.keyboard import GlobalHotKeys

    return GlobalHotKeys(mapping)


class GlobalHotkeyManager:
    """Thread-safe wrapper managing pynput GlobalHotKeys with rebinding & clean teardown."""

    def __init__(
        self,
        listener_factory: Callable[[dict[str, Callable[[], None]]], Any] = _default_listener_factory,
    ) -> None:
        self._lock = threading.RLock()
        self._listener_factory = listener_factory
        self._listener: Optional[Any] = None
        self._bindings = HotkeyBindings()
        self._callbacks: dict[str, Callable[[], None]] = {}
        self._last_error: Optional[str] = None

    @property
    def last_error(self) -> Optional[str]:
        with self._lock:
            return self._last_error

    def start(
        self,
        bindings: HotkeyBindings,
        on_start_resume: Callable[[], None],
        on_pause: Callable[[], None],
        on_abort: Callable[[], None],
    ) -> Optional[str]:
        with self._lock:
            self._callbacks = {
                "start_resume": on_start_resume,
                "pause": on_pause,
                "abort": on_abort,
            }
            return self.rebind(bindings)

    def rebind(self, bindings: HotkeyBindings) -> Optional[str]:
        """Validate new hotkey bindings, stop old listener, and start a fresh one."""
        with self._lock:
            self._bindings = bindings
            if not self._callbacks:
                return None

            try:
                start_key = normalize_hotkey_to_pynput(bindings.start_resume)
                pause_key = normalize_hotkey_to_pynput(bindings.pause)
                abort_key = normalize_hotkey_to_pynput(bindings.abort)
            except ValueError as exc:
                self._last_error = str(exc)
                return self._last_error

            if len({start_key, pause_key, abort_key}) < 3:
                self._last_error = "Global hotkeys must be unique for Start/Resume, Pause, and Abort."
                return self._last_error

            mapping = {
                start_key: self._callbacks["start_resume"],
                pause_key: self._callbacks["pause"],
                abort_key: self._callbacks["abort"],
            }

            self.stop()
            try:
                listener = self._listener_factory(mapping)
                listener.daemon = True
                listener.start()
                self._listener = listener
                self._last_error = None
                return None
            except Exception as exc:
                self._last_error = f"Failed to register global hotkeys: {exc}"
                return self._last_error

    def stop(self) -> None:
        with self._lock:
            if self._listener is not None:
                try:
                    self._listener.stop()
                except Exception:
                    pass
                self._listener = None
