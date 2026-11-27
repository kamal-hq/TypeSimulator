"""End-to-end regression tests for Desktop static server, bridge workflows, navigation guard, and headers."""

from __future__ import annotations

import http.client
import json
import re
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from backend.bridge import DesktopBridge, HUD_SIZE, MAX_PAYLOAD_CHARS, STUDIO_SIZE
from backend.cadence import CadenceGenerator
from backend.desktop_app import (
    DESKTOP_CSP_REPORT_ONLY,
    LocalStaticServer,
    _attach_webview_navigation_guard,
)
from backend.engine import TypingEngine
from backend.models import TypingConfig
from backend.storage import LocalStorage, MAX_SNIPPET_TEXT_CHARS

REPO_ROOT = Path(__file__).resolve().parent.parent
REAL_FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
VERCEL_CONFIG = REPO_ROOT / "frontend" / "vercel.json"


class _FakeKeyboard:
    def __init__(self) -> None:
        self.buffer: list[str] = []
        self.events: list[str] = []
        self.lock = threading.Lock()

    def type_char(self, char: str) -> None:
        with self.lock:
            self.buffer.append(char)
            self.events.append(char)

    def press_enter(self, shift: bool = False) -> None:
        with self.lock:
            self.buffer.append("\n")
            self.events.append("SHIFT+ENTER" if shift else "ENTER")

    def press_tab(self) -> None:
        with self.lock:
            self.buffer.append("\t")
            self.events.append("TAB")

    def press_backspace(self) -> None:
        with self.lock:
            self.events.append("BACKSPACE")
            if self.buffer:
                self.buffer.pop()

    @property
    def text(self) -> str:
        with self.lock:
            return "".join(self.buffer)


class _FakeWindowMonitor:
    def __init__(self, hwnd: int = 4242, title: str = 'VDI — “Prod” <Terminal>\u2028') -> None:
        self.hwnd = hwnd
        self.title = title

    def get_active_window(self) -> tuple[int, str]:
        return (self.hwnd, self.title)

    def is_elevated(self) -> bool:
        return False


class _FastCadence(CadenceGenerator):
    def compute_delay(self, char: str, prev_char: str | None, config: TypingConfig) -> float:
        return 0.004

    def typo_reaction_delay(self) -> float:
        return 0.001

    def typo_recovery_delay(self) -> float:
        return 0.001


class _FakePyWebViewWindow:
    def __init__(self) -> None:
        self.on_top = False
        self.size = STUDIO_SIZE
        self.js_calls: list[str] = []

    def resize(self, width: int, height: int) -> None:
        self.size = (width, height)

    def evaluate_js(self, code: str) -> None:
        self.js_calls.append(code)


class _FakeEventHook:
    def __init__(self) -> None:
        self.handlers: list = []

    def __iadd__(self, fn):
        self.handlers.append(fn)
        return self

    def fire(self, sender, args) -> None:
        for fn in self.handlers:
            fn(sender, args)


class _FakeNavArgs:
    def __init__(self, uri: str) -> None:
        self.Uri = uri
        self.Cancel = False


class _FakeNativeWindow:
    def __init__(self) -> None:
        self.native = type("NativeForm", (), {"webview": type("WebView", (), {"NavigationStarting": _FakeEventHook()})()})()


def _wait_state(bridge: DesktopBridge, wanted: str, timeout: float = 2.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        snap = bridge.get_snapshot()
        if snap["state"] == wanted:
            return snap
        time.sleep(0.005)
    raise AssertionError(f"Timed out waiting for {wanted}; actual={bridge.get_snapshot()['state']}")


def test_e2e_desktop_bridge_full_user_workflow_and_boundary_caps(tmp_path):
    """Run realistic end-to-end DesktopBridge flows and confirm valid inputs pass while bad inputs fail."""
    store = LocalStorage(data_dir=tmp_path)
    monitor = _FakeWindowMonitor()
    kb = _FakeKeyboard()
    opened_urls: list[str] = []

    bridge = DesktopBridge(
        storage=store,
        window_monitor=monitor,
        url_opener=lambda url: opened_urls.append(url),
    )
    # Swap in deterministic fake keyboard & fast cadence (no real OS keystrokes)
    bridge._engine.shutdown()
    bridge._engine = TypingEngine(
        keyboard=kb,
        window_monitor=monitor,
        cadence=_FastCadence(),
        config=store.load_config(),
    )
    bridge._engine.subscribe(bridge._push_snapshot)

    win = _FakePyWebViewWindow()
    bridge._window = win

    try:
        # 1. Runtime & config baseline
        info = bridge.get_runtime_info()
        assert info["mode"] == "desktop"
        assert info["isElevated"] is False

        # 2. Update config with realistic settings + newline/tab rules
        updated = bridge.update_config(
            {
                "targetWpm": 92,
                "variability": 25,
                "countdown": 0,
                "typosEnabled": False,
                "newlines": "shift-enter",
                "tabs": "2-spaces",
                "focusGuard": True,
            }
        )
        assert updated["hotkeyError"] is None
        assert updated["config"]["targetWpm"] == 92
        assert updated["config"]["newlines"] == "shift-enter"
        assert updated["config"]["tabs"] == "2-spaces"

        # 3. Realistic payload sanitization & exact boundary checks
        payload = "“Hello” —\tworld…\r\n• Line 2"
        san = bridge.sanitize(payload)
        assert san["sanitized"] == '"Hello" -  world...\n- Line 2'
        assert san["totalArtifacts"] == 6

        # Exact max payload boundary succeeds; +1 char fails
        bridge.set_staged_text("x" * MAX_PAYLOAD_CHARS)
        with pytest.raises(ValueError, match="100,000"):
            bridge.set_staged_text("x" * (MAX_PAYLOAD_CHARS + 1))
        with pytest.raises(ValueError, match="100,000"):
            bridge.start("x" * (MAX_PAYLOAD_CHARS + 1))

        # Exact max snippet boundary succeeds; +1 char fails
        max_snip = bridge.save_snippet("Boundary OK", "y" * MAX_SNIPPET_TEXT_CHARS, ["Edge"])
        assert len(max_snip["text"]) == MAX_SNIPPET_TEXT_CHARS
        bridge.delete_snippet(max_snip["id"])
        with pytest.raises(ValueError, match="50,000"):
            bridge.save_snippet("Too Large", "y" * (MAX_SNIPPET_TEXT_CHARS + 1), ["Edge"])

        # 4. Run full typing + mid-run Focus Guard auto-pause + resume to completion
        long_payload = "Line one with “smart quotes” — ready.\nLine two finishes cleanly."
        bridge.start(long_payload)

        deadline = time.monotonic() + 1.5
        while time.monotonic() < deadline and bridge.get_snapshot()["cursor"] < 6:
            time.sleep(0.005)

        # Trigger real Focus Guard switch with exotic/malicious window title
        monitor.hwnd = 9999
        monitor.title = 'Alert\u2029</script><img src=x onerror=alert(1)>'
        paused = _wait_state(bridge, "PAUSED")
        assert "Alert" in paused["pauseReason"]

        # Confirm every evaluate_js call emitted is pure ASCII & contains valid JSON payload
        assert len(win.js_calls) > 0
        for call in win.js_calls:
            assert call.isascii()
            assert "</script>" not in call
            match = re.search(r"window\.__typeSimulatorOnEvent\((\{.*\})\);", call)
            assert match is not None
            parsed = json.loads(match.group(1))
            assert "state" in parsed

        # Resume and finish remaining characters cleanly
        bridge._engine.resume(skip_countdown=True)
        done = _wait_state(bridge, "COMPLETED")
        assert done["cursor"] == done["total"]
        assert kb.text == 'Line one with "smart quotes" - ready.\nLine two finishes cleanly.'
        assert "SHIFT+ENTER" in kb.events

        # 5. Compact HUD & Always-on-Top state restoration
        assert bridge.set_always_on_top(True) is True
        assert bridge.set_compact_hud(True) is True
        assert win.size == HUD_SIZE
        assert bridge.set_compact_hud(False) is False
        assert win.size == STUDIO_SIZE
        assert win.on_top is True

        # 6. External link allowlist accepts valid links and rejects untrusted ones
        assert bridge.open_external_url("https://github.com/kamal-hq/TypeSimulator/releases/latest") is True
        assert bridge.open_external_url("mailto:muhammad.kamal.hq@gmail.com") is True
        assert len(opened_urls) == 2

        for bad_url in (
            "https://example.com",
            "javascript:alert(1)",
            "file:///C:/Windows/win.ini",
            "mailto:other@example.com",
        ):
            with pytest.raises(ValueError):
                bridge.open_external_url(bad_url)
        assert len(opened_urls) == 2

        # 7. Clear all local data wipes disk files and resets config + state
        cleared = bridge.clear_all_data()
        assert cleared["snippets"] == []
        assert cleared["config"]["targetWpm"] == 68
        assert not (tmp_path / "config.json").exists()
        assert not (tmp_path / "snippets.json").exists()
    finally:
        bridge.shutdown()


def test_e2e_webview_navigation_guard_blocks_off_origin_and_routes_allowlisted(tmp_path):
    """Simulate native WebView2 NavigationStarting events and confirm exact block/route behavior."""
    opened: list[str] = []
    bridge = DesktopBridge(
        storage=LocalStorage(data_dir=tmp_path),
        url_opener=lambda url: opened.append(url),
    )
    fake_win = _FakeNativeWindow()
    allowed_origin = "http://127.0.0.1:51234"
    _attach_webview_navigation_guard(fake_win, allowed_origin, bridge)
    nav_hook = fake_win.native.webview.NavigationStarting

    try:
        # Same-origin navigation allowed
        ok_args = _FakeNavArgs("http://127.0.0.1:51234/index.html")
        nav_hook.fire(None, ok_args)
        assert ok_args.Cancel is False
        assert opened == []

        # about:blank allowed
        blank_args = _FakeNavArgs("about:blank")
        nav_hook.fire(None, blank_args)
        assert blank_args.Cancel is False

        # Allowlisted GitHub link: cancelled inside WebView, opened in OS browser
        gh_args = _FakeNavArgs("https://github.com/kamal-hq/TypeSimulator")
        nav_hook.fire(None, gh_args)
        assert gh_args.Cancel is True
        assert opened == ["https://github.com/kamal-hq/TypeSimulator"]

        # Untrusted site: cancelled inside WebView AND never opened in OS browser
        evil_args = _FakeNavArgs("https://attacker.example/exploit")
        nav_hook.fire(None, evil_args)
        assert evil_args.Cancel is True
        assert opened == ["https://github.com/kamal-hq/TypeSimulator"]

        # javascript: and file:// cancelled AND never opened
        for bad in ("javascript:alert(1)", "file:///C:/Windows/win.ini"):
            args = _FakeNavArgs(bad)
            nav_hook.fire(None, args)
            assert args.Cancel is True
        assert opened == ["https://github.com/kamal-hq/TypeSimulator"]
    finally:
        bridge.shutdown()


def test_e2e_local_static_server_serves_assets_enforces_headers_and_rejects_bad_requests(tmp_path):
    """Test LocalStaticServer against synthetic HTML/JS/CSS/font assets, HEAD, 404, 403, and POST."""
    dist = tmp_path / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text(
        '<!doctype html><link rel="stylesheet" href="./assets/app.css"><script src="./assets/app.js"></script>',
        encoding="utf-8",
    )
    (assets / "app.css").write_text("@font-face{src:url(./inter.woff2)}", encoding="utf-8")
    (assets / "app.js").write_text("console.log('ok')", encoding="utf-8")
    (assets / "inter.woff2").write_bytes(b"wOF2\x00\x01mockfont")
    (tmp_path / "secret.txt").write_text("DO_NOT_SERVE", encoding="utf-8")

    server = LocalStaticServer(dist)
    server.start()
    try:
        # Normal GET on root, JS, CSS, font
        for path, expected_ct in (
            ("/", "text/html"),
            ("/index.html", "text/html"),
            ("/assets/app.css", "text/css"),
            ("/assets/app.js", "javascript"),
            ("/assets/inter.woff2", ""),
        ):
            with urllib.request.urlopen(f"{server.origin}{path}", timeout=3) as resp:
                assert resp.status == 200
                if expected_ct:
                    assert expected_ct in (resp.headers.get("Content-Type") or "")
                assert resp.headers.get("Content-Security-Policy-Report-Only") == DESKTOP_CSP_REPORT_ONLY
                assert resp.headers.get("Content-Security-Policy") is None
                assert resp.headers.get("X-Content-Type-Options") == "nosniff"
                assert resp.headers.get("X-Frame-Options") == "DENY"
                assert resp.headers.get("Referrer-Policy") == "no-referrer"
                assert "camera=()" in (resp.headers.get("Permissions-Policy") or "")
                assert resp.headers.get("Cache-Control") == "no-store"
                assert resp.headers.get("Access-Control-Allow-Origin") is None

        # HEAD returns 200 with zero body
        host, port = server._server.server_address[:2]
        conn = http.client.HTTPConnection(host, port, timeout=3)
        conn.request("HEAD", "/index.html")
        head_resp = conn.getresponse()
        assert head_resp.status == 200
        assert head_resp.read() == b""
        assert head_resp.getheader("X-Frame-Options") == "DENY"

        # POST rejected (read-only static server)
        conn.request("POST", "/index.html", body=b"x")
        post_resp = conn.getresponse()
        assert post_resp.status == 501
        post_resp.read()
        conn.close()

        # Missing file -> 404 with security headers intact
        with pytest.raises(urllib.error.HTTPError) as missing:
            urllib.request.urlopen(f"{server.origin}/assets/nope.js", timeout=3)
        assert missing.value.code == 404
        assert missing.value.headers.get("X-Content-Type-Options") == "nosniff"

        # Path traversal variants -> 403
        for bad_path in ("/..%2Fsecret.txt", "/assets/..%2F..%2Fsecret.txt", "/..%5Csecret.txt"):
            with pytest.raises(urllib.error.HTTPError) as blocked:
                urllib.request.urlopen(f"{server.origin}{bad_path}", timeout=3)
            assert blocked.value.code == 403
    finally:
        server.stop()


def test_vercel_json_headers_and_enforcement_contract():
    """Confirm exact Vercel headers: Report-Only CSP, enforced hardening headers, and npm ci."""
    cfg = json.loads(VERCEL_CONFIG.read_text(encoding="utf-8"))
    assert cfg["installCommand"] == "npm ci"
    assert cfg["buildCommand"] == "npm run build:web"
    assert cfg["outputDirectory"] == "dist"

    headers_map = {h["key"]: h["value"] for h in cfg["headers"][0]["headers"]}
    assert "Content-Security-Policy-Report-Only" in headers_map
    assert "Content-Security-Policy" not in headers_map

    csp = headers_map["Content-Security-Policy-Report-Only"]
    assert "font-src 'self'" in csp
    assert "fonts.googleapis.com" not in csp
    assert "fonts.gstatic.com" not in csp
    assert "script-src 'self'" in csp
    assert "style-src 'self' 'unsafe-inline'" in csp
    assert "frame-ancestors 'none'" in csp

    assert headers_map["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
    assert headers_map["X-Content-Type-Options"] == "nosniff"
    assert headers_map["X-Frame-Options"] == "DENY"
    assert headers_map["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in headers_map["Permissions-Policy"]


@pytest.mark.skipif(
    not (REAL_FRONTEND_DIST / "index.html").exists(),
    reason="frontend/dist not built in Python-only CI job",
)
def test_e2e_real_built_frontend_served_by_local_static_server():
    """Serve the actual compiled frontend/dist over LocalStaticServer and verify assets, fonts, and zero CDN refs."""
    server = LocalStaticServer(REAL_FRONTEND_DIST)
    server.start()
    try:
        with urllib.request.urlopen(server.index_url, timeout=3) as resp:
            assert resp.status == 200
            html = resp.read().decode("utf-8")
            assert '<div id="root"></div>' in html
            assert "fonts.googleapis.com" not in html

        # Fetch the real bundled CSS and JS referenced by index.html
        asset_refs = re.findall(r'(?:src|href)="(\.?/assets/[^"]+)"', html)
        assert len(asset_refs) >= 2

        css_text = ""
        js_text = ""
        for ref in asset_refs:
            rel = ref.lstrip(".")
            with urllib.request.urlopen(f"{server.origin}{rel}", timeout=3) as resp:
                assert resp.status == 200
                body = resp.read().decode("utf-8")
                assert "fonts.googleapis.com" not in body
                assert "fonts.gstatic.com" not in body
                assert "[CONTACT_EMAIL]" not in body
                if rel.endswith(".css"):
                    css_text += body
                elif rel.endswith(".js"):
                    js_text += body

        # Confirm compliance strings and email exist in compiled JS bundle
        assert "muhammad.kamal.hq@gmail.com" in js_text
        assert "Privacy Policy" in js_text
        assert "Terms of Service" in js_text
        assert "Clear all local data" in js_text

        # Confirm self-hosted Inter & JetBrains Mono WOFF2 font files actually serve 200 from LocalStaticServer
        font_refs = re.findall(r"url\(([^)]+\.woff2)\)", css_text)
        inter_fonts = [f.strip("'\"") for f in font_refs if "inter-latin-" in f]
        jb_fonts = [f.strip("'\"") for f in font_refs if "jetbrains-mono-latin-" in f]
        assert len(inter_fonts) > 0 and len(jb_fonts) > 0

        for font_rel in (inter_fonts[0], jb_fonts[0]):
            url_path = font_rel if font_rel.startswith("/") else f"/assets/{font_rel.lstrip('./')}"
            with urllib.request.urlopen(f"{server.origin}{url_path}", timeout=3) as resp:
                assert resp.status == 200
                data = resp.read()
                assert data.startswith(b"wOF2")
    finally:
        server.stop()
