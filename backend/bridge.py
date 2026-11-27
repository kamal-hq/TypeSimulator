"""PyWebView JS <-> Python API bridge and live event dispatcher."""

from __future__ import annotations

import json
import posixpath
import sys
import threading
import webbrowser
from typing import Any, Callable, Optional
from urllib.parse import urlsplit

from backend import __version__
from backend.engine import TypingEngine
from backend.focus_guard import Win32WindowMonitor
from backend.hotkeys import GlobalHotkeyManager
from backend.models import EngineSnapshot, TypingConfig
from backend.sanitizer import sanitize_text
from backend.storage import LocalStorage

STUDIO_SIZE = (1280, 820)
HUD_SIZE = (600, 100)
MAX_PAYLOAD_CHARS = 100_000

_ALLOWED_GITHUB_REPO_PATH = "/kamal-hq/typesimulator"
_ALLOWED_MAILTO = "mailto:muhammad.kamal.hq@gmail.com"


def is_allowed_external_url(url: str) -> bool:
    """Strictly allowlist external URLs that Desktop Mode may open in the OS browser."""
    raw = (url or "").strip()
    if not raw or len(raw) > 512:
        return False

    if raw.lower() == _ALLOWED_MAILTO:
        return True

    parsed = urlsplit(raw)
    if parsed.scheme != "https":
        return False
    if parsed.username is not None or parsed.password is not None:
        return False
    if (parsed.hostname or "").lower() != "github.com":
        return False
    if parsed.port not in (None, 443):
        return False

    norm_path = posixpath.normpath(parsed.path or "/")
    lower_path = norm_path.lower()
    return lower_path == _ALLOWED_GITHUB_REPO_PATH or lower_path.startswith(_ALLOWED_GITHUB_REPO_PATH + "/")


def serialize_snapshot_for_js(snapshot_dict: dict[str, Any]) -> str:
    """Serialize snapshot as pure ASCII JSON safe for interpolation inside evaluate_js."""
    return (
        json.dumps(snapshot_dict, ensure_ascii=True)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
    )


def _validate_payload(text: Any) -> str:
    value = str(text or "")
    if len(value) > MAX_PAYLOAD_CHARS:
        raise ValueError(f"Payload exceeds maximum limit of {MAX_PAYLOAD_CHARS:,} characters.")
    return value


class DesktopBridge:
    """Exposed to JavaScript as `window.pywebview.api`."""

    def __init__(
        self,
        storage: Optional[LocalStorage] = None,
        window_monitor: Optional[Win32WindowMonitor] = None,
        url_opener: Callable[[str], Any] = lambda target: webbrowser.open(target, new=2),
    ) -> None:
        self._storage = storage or LocalStorage()
        self._window_monitor = window_monitor or Win32WindowMonitor()
        self._url_opener = url_opener
        saved_config = self._storage.load_config()
        self._engine = TypingEngine(
            window_monitor=self._window_monitor,
            config=saved_config,
        )
        self._hotkeys = GlobalHotkeyManager()
        self._window: Optional[Any] = None
        self._staged_text: str = ""
        self._text_lock = threading.Lock()
        self._always_on_top: bool = False
        self._pre_hud_on_top: bool = False
        self._is_compact_hud: bool = False

        self._engine.subscribe(self._push_snapshot)

    def attach_window(self, window: Any) -> None:
        self._window = window
        cfg = self._engine.config
        self._hotkeys.start(
            bindings=cfg.hotkeys,
            on_start_resume=self._on_global_start_resume,
            on_pause=self._on_global_pause,
            on_abort=self._on_global_abort,
        )

    def shutdown(self) -> None:
        self._hotkeys.stop()
        self._engine.shutdown()

    # --- Global Hotkey Callbacks ---

    def _on_global_start_resume(self) -> None:
        with self._text_lock:
            text = self._staged_text
        self._engine.start_or_resume(text, from_hotkey=True)

    def _on_global_pause(self) -> None:
        self._engine.pause("Paused via global hotkey")

    def _on_global_abort(self) -> None:
        self._engine.abort()

    # --- Event Push (Python -> JS) ---

    def _push_snapshot(self, snapshot: EngineSnapshot) -> None:
        window = self._window
        if window is None:
            return
        payload = serialize_snapshot_for_js(snapshot.to_dict())
        try:
            window.evaluate_js(
                f"window.__typeSimulatorOnEvent && window.__typeSimulatorOnEvent({payload});"
            )
        except Exception:
            pass

    # --- Public RPC Methods (JS -> Python) ---

    def get_runtime_info(self) -> dict[str, Any]:
        return {
            "mode": "desktop",
            "label": "Desktop OS Engine",
            "version": __version__,
            "platform": sys.platform,
            "isElevated": self._window_monitor.is_elevated(),
            "hotkeyError": self._hotkeys.last_error,
        }

    def get_config(self) -> dict[str, Any]:
        return self._engine.config.to_dict()

    def update_config(self, patch: dict[str, Any]) -> dict[str, Any]:
        prev_hotkeys = self._engine.config.hotkeys.to_dict()
        updated = self._engine.update_config(patch or {})
        self._storage.save_config(updated)

        hotkey_error: Optional[str] = None
        if updated.hotkeys.to_dict() != prev_hotkeys:
            hotkey_error = self._hotkeys.rebind(updated.hotkeys)

        return {"config": updated.to_dict(), "hotkeyError": hotkey_error}

    def set_staged_text(self, text: str) -> None:
        validated = _validate_payload(text)
        with self._text_lock:
            self._staged_text = validated

    def sanitize(self, text: str, config_dict: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        validated = _validate_payload(text)
        cfg = TypingConfig.from_dict(config_dict) if config_dict else self._engine.config
        return sanitize_text(validated, cfg).to_dict()

    def start(self, text: str) -> dict[str, Any]:
        validated = _validate_payload(text)
        with self._text_lock:
            self._staged_text = validated
        return self._engine.start(validated).to_dict()

    def pause(self, reason: Optional[str] = None) -> dict[str, Any]:
        return self._engine.pause(reason or "Paused manually").to_dict()

    def resume(self) -> dict[str, Any]:
        return self._engine.resume(skip_countdown=False).to_dict()

    def abort(self) -> dict[str, Any]:
        return self._engine.abort().to_dict()

    def reset(self) -> dict[str, Any]:
        return self._engine.reset().to_dict()

    def get_snapshot(self) -> dict[str, Any]:
        return self._engine.get_snapshot().to_dict()

    # --- Snippets & Local Data Deletion ---

    def list_snippets(self) -> list[dict[str, Any]]:
        return [s.to_dict() for s in self._storage.list_snippets()]

    def save_snippet(self, title: str, text: str, tags: list[str]) -> dict[str, Any]:
        saved = self._storage.save_snippet(title=title, text=text, tags=tags or [])
        return saved.to_dict()

    def delete_snippet(self, snippet_id: str) -> None:
        self._storage.delete_snippet(str(snippet_id))

    def clear_all_data(self) -> dict[str, Any]:
        """Delete all local persisted data and reset in-memory engine state and defaults."""
        snap = self._engine.reset()
        default_cfg = TypingConfig()
        updated = self._engine.update_config(default_cfg.to_dict())
        with self._text_lock:
            self._staged_text = ""
        self._storage.clear_all_data()
        hotkey_error = self._hotkeys.rebind(updated.hotkeys)
        return {
            "config": updated.to_dict(),
            "snippets": [],
            "snapshot": snap.to_dict(),
            "hotkeyError": hotkey_error,
        }

    # --- Safe External Browser Navigation ---

    def open_external_url(self, url: str) -> bool:
        """Open only allowlisted external URLs in the user's default browser."""
        if not is_allowed_external_url(url):
            raise ValueError("Blocked external URL outside allowlist.")
        self._url_opener(url.strip())
        return True

    # --- Native Window Controls ---

    def set_always_on_top(self, enabled: bool) -> bool:
        self._always_on_top = bool(enabled)
        if self._window is not None:
            try:
                self._window.on_top = self._always_on_top
            except Exception:
                pass
        return self._always_on_top

    def set_compact_hud(self, enabled: bool) -> bool:
        want_hud = bool(enabled)
        if self._window is not None and want_hud != self._is_compact_hud:
            try:
                from backend.desktop_app import apply_windows_dark_chrome

                if want_hud:
                    self._pre_hud_on_top = self._always_on_top
                    self._window.resize(*HUD_SIZE)
                    self._window.on_top = True
                    apply_windows_dark_chrome(self._window, caption_bgr=0x00151515)
                else:
                    self._window.resize(*STUDIO_SIZE)
                    self._window.on_top = self._pre_hud_on_top
                    apply_windows_dark_chrome(self._window, caption_bgr=0x000B0B0B)
            except Exception:
                pass
        self._is_compact_hud = want_hud
        return self._is_compact_hud
