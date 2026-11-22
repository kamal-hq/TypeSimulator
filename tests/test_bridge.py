"""Integration tests for backend.bridge.DesktopBridge RPC and window controls."""

from backend.bridge import DesktopBridge, HUD_SIZE, STUDIO_SIZE
from backend.storage import LocalStorage


class FakeWindow:
    def __init__(self) -> None:
        self.on_top = False
        self.size = STUDIO_SIZE
        self.js_calls: list[str] = []

    def resize(self, width: int, height: int) -> None:
        self.size = (width, height)

    def evaluate_js(self, code: str) -> None:
        self.js_calls.append(code)


class FakeMonitor:
    def get_active_window(self) -> tuple[int, str]:
        return (555, "Notepad — Untitled")

    def is_elevated(self) -> bool:
        return True


def test_bridge_config_snippets_and_window_controls(tmp_path):
    store = LocalStorage(data_dir=tmp_path)
    bridge = DesktopBridge(storage=store, window_monitor=FakeMonitor())
    win = FakeWindow()
    bridge._window = win  # Attach without hooking real OS hotkeys

    try:
        info = bridge.get_runtime_info()
        assert info["mode"] == "desktop"
        assert info["isElevated"] is True

        # Sanitize RPC
        san = bridge.sanitize("“Alpha” — Beta…")
        assert san["sanitized"] == '"Alpha" - Beta...'
        assert san["totalArtifacts"] == 4

        # Config update persists
        res = bridge.update_config({"targetWpm": 95, "newlines": "shift-enter"})
        assert res["config"]["targetWpm"] == 95
        assert res["config"]["newlines"] == "shift-enter"
        assert store.load_config().target_wpm == 95

        # Snippets CRUD
        initial = bridge.list_snippets()
        assert len(initial) == 3
        saved = bridge.save_snippet("SSH Check", "uptime", ["Ops"])
        assert len(bridge.list_snippets()) == 4
        bridge.delete_snippet(saved["id"])
        assert len(bridge.list_snippets()) == 3

        # Always-on-top & Compact HUD resize + restore
        assert bridge.set_always_on_top(False) is False
        assert win.on_top is False

        assert bridge.set_compact_hud(True) is True
        assert win.size == HUD_SIZE
        assert win.on_top is True

        assert bridge.set_compact_hud(False) is False
        assert win.size == STUDIO_SIZE
        assert win.on_top is False
    finally:
        bridge.shutdown()
