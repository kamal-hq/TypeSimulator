"""Security and privacy regression tests for IPC, origin isolation, CSP, limits, and keystroke privacy."""

from __future__ import annotations

import logging
import urllib.error
import urllib.request

import pytest
from pynput.keyboard import GlobalHotKeys, Key, KeyCode

from backend.bridge import (
    DesktopBridge,
    MAX_PAYLOAD_CHARS,
    is_allowed_external_url,
    serialize_snapshot_for_js,
)
from backend.desktop_app import (
    DESKTOP_CSP_REPORT_ONLY,
    LocalStaticServer,
    apply_windows_dark_chrome,
    is_allowed_app_navigation,
    is_debug_enabled,
    resolve_icon_path,
    validate_dev_url,
)
from backend.storage import (
    LocalStorage,
    MAX_SNIPPETS,
    MAX_SNIPPET_TAGS,
    MAX_SNIPPET_TEXT_CHARS,
    MAX_SNIPPET_TITLE_CHARS,
)


def test_dev_url_restricted_to_loopback_and_disabled_when_frozen():
    assert validate_dev_url(None, is_frozen=False) is None
    assert validate_dev_url("http://127.0.0.1:5173", is_frozen=False) == "http://127.0.0.1:5173"
    assert validate_dev_url("http://localhost:5173/", is_frozen=False) == "http://localhost:5173/"

    # Frozen packaged builds MUST ignore TYPESIM_DEV_URL even if set to localhost or evil URL
    assert validate_dev_url("http://127.0.0.1:5173", is_frozen=True) is None
    assert validate_dev_url("https://evil.example.com", is_frozen=True) is None

    # Non-loopback, https, credentials, or non-http schemes must raise ValueError
    for bad in (
        "https://127.0.0.1:5173",
        "http://evil.example.com:5173",
        "http://192.168.1.5:5173",
        "http://user:pass@127.0.0.1:5173",
        "file:///C:/Windows/System32/calc.exe",
        "javascript:alert(1)",
    ):
        with pytest.raises(ValueError):
            validate_dev_url(bad, is_frozen=False)


def test_debug_flag_disabled_when_frozen(monkeypatch):
    monkeypatch.setenv("TYPESIM_DEBUG", "1")
    assert is_debug_enabled(is_frozen=False) is True
    assert is_debug_enabled(is_frozen=True) is False


def test_navigation_guard_blocks_off_origin_and_dangerous_schemes():
    origin = "http://127.0.0.1:54321"
    assert is_allowed_app_navigation("http://127.0.0.1:54321/index.html", origin) is True
    assert is_allowed_app_navigation("http://127.0.0.1:54321/assets/app.js", origin) is True
    assert is_allowed_app_navigation("about:blank", origin) is True

    for blocked in (
        "https://evil.example.com/",
        "https://github.com/kamal-hq/TypeSimulator",
        "http://127.0.0.1:9999/",
        "http://localhost:54321/",
        "file:///C:/Windows/win.ini",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
    ):
        assert is_allowed_app_navigation(blocked, origin) is False


def test_external_url_allowlist():
    for allowed in (
        "https://github.com/kamal-hq/TypeSimulator",
        "https://github.com/kamal-hq/TypeSimulator/releases/latest",
        "https://github.com/kamal-hq/TypeSimulator/releases/latest/download/TypeSimulator-Setup-v2.0.0.exe",
        "mailto:muhammad.kamal.hq@gmail.com",
    ):
        assert is_allowed_external_url(allowed) is True

    for blocked in (
        "http://github.com/kamal-hq/TypeSimulator",
        "https://github.com/other-user/TypeSimulator",
        "https://github.com/kamal-hq/TypeSimulator/../../other/repo",
        "https://user:pass@github.com/kamal-hq/TypeSimulator",
        "https://evil.example.com",
        "javascript:alert(1)",
        "file:///C:/Windows/System32/cmd.exe",
        "mailto:attacker@evil.example.com",
    ):
        assert is_allowed_external_url(blocked) is False


def test_open_external_url_enforces_allowlist(tmp_path):
    opened: list[str] = []
    bridge = DesktopBridge(
        storage=LocalStorage(data_dir=tmp_path),
        url_opener=lambda u: opened.append(u),
    )
    try:
        assert bridge.open_external_url("https://github.com/kamal-hq/TypeSimulator") is True
        assert opened == ["https://github.com/kamal-hq/TypeSimulator"]

        with pytest.raises(ValueError):
            bridge.open_external_url("https://evil.example.com/phish")
        assert len(opened) == 1
    finally:
        bridge.shutdown()


def test_evaluate_js_serializer_outputs_pure_ascii_and_escapes_script_breakers():
    malicious_title = 'Bank\u2028Title\u2029</script><script>alert("xss")</script>'
    encoded = serialize_snapshot_for_js({"targetWindowTitle": malicious_title})

    assert encoded.isascii()
    assert "\u2028" not in encoded
    assert "\u2029" not in encoded
    assert "</script>" not in encoded
    assert "<" not in encoded and ">" not in encoded


def test_payload_and_snippet_size_and_count_limits(tmp_path):
    store = LocalStorage(data_dir=tmp_path)
    bridge = DesktopBridge(storage=store)
    try:
        oversized_payload = "a" * (MAX_PAYLOAD_CHARS + 1)
        with pytest.raises(ValueError):
            bridge.set_staged_text(oversized_payload)
        with pytest.raises(ValueError):
            bridge.start(oversized_payload)
        with pytest.raises(ValueError):
            bridge.sanitize(oversized_payload)

        with pytest.raises(ValueError):
            store.save_snippet("Too big", "x" * (MAX_SNIPPET_TEXT_CHARS + 1), [])

        long_title_snippet = store.save_snippet(
            "T" * 300,
            "ok",
            [f"tag-{i}-" + ("z" * 40) for i in range(25)],
        )
        assert len(long_title_snippet.title) == MAX_SNIPPET_TITLE_CHARS
        assert len(long_title_snippet.tags) == MAX_SNIPPET_TAGS
        assert all(len(t) <= 32 for t in long_title_snippet.tags)

        # Fill up to MAX_SNIPPETS and confirm overflow is blocked
        while len(store.list_snippets()) < MAX_SNIPPETS:
            store.save_snippet("fill", "x", [])
        with pytest.raises(ValueError):
            store.save_snippet("overflow", "x", [])
    finally:
        bridge.shutdown()


def test_clear_all_data_removes_disk_files_and_resets_state(tmp_path):
    store = LocalStorage(data_dir=tmp_path)
    bridge = DesktopBridge(storage=store)
    try:
        bridge.update_config({"targetWpm": 115})
        bridge.save_snippet("Temp Secret Note", "private-token-demo", ["Work"])
        bridge.set_staged_text("Some staged payload")

        assert (tmp_path / "config.json").exists()
        assert (tmp_path / "snippets.json").exists()

        result = bridge.clear_all_data()
        assert result["snippets"] == []
        assert result["config"]["targetWpm"] == 68
        assert not (tmp_path / "config.json").exists()
        assert not (tmp_path / "snippets.json").exists()
        assert bridge._staged_text == ""
    finally:
        bridge.shutdown()


def test_local_static_server_delivers_report_only_csp_and_blocks_traversal(tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<!doctype html><html><body>OK</body></html>", encoding="utf-8")
    (tmp_path / "outside.txt").write_text("SECRET", encoding="utf-8")

    server = LocalStaticServer(dist)
    url = server.start()
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            assert resp.status == 200
            assert resp.headers.get("Content-Security-Policy-Report-Only") == DESKTOP_CSP_REPORT_ONLY
            assert resp.headers.get("X-Content-Type-Options") == "nosniff"
            assert resp.headers.get("X-Frame-Options") == "DENY"
            assert resp.headers.get("Referrer-Policy") == "no-referrer"
            assert "Access-Control-Allow-Origin" not in resp.headers

        # Path traversal outside dist/ must be rejected (403)
        with pytest.raises(urllib.error.HTTPError) as exc_info:
            urllib.request.urlopen(f"{server.origin}/..%2Foutside.txt", timeout=3)
        assert exc_info.value.code == 403
    finally:
        server.stop()


def test_keystroke_privacy_pynput_discards_non_hotkey_characters(caplog):
    """Verify pynput GlobalHotKeys reacts ONLY to configured hotkeys and retains/logs nothing typed."""
    triggered: list[str] = []
    listener = GlobalHotKeys(
        {
            "<f9>": lambda: triggered.append("start"),
            "<f10>": lambda: triggered.append("pause"),
            "<ctrl>+<shift>+<esc>": lambda: triggered.append("abort"),
        }
    )

    with caplog.at_level(logging.DEBUG):
        # Simulate user typing a sensitive password into another application
        for ch in "MyBankPassword!2026":
            key = KeyCode.from_char(ch)
            listener._on_press(key, injected=False)
            listener._on_release(key, injected=False)

    assert triggered == []
    # No typed key is retained in any HotKey state set
    assert all(len(hk._state) == 0 for hk in listener._hotkeys)
    # Zero log output containing typed characters
    assert caplog.records == []

    # Now verify configured hotkey <f9> triggers cleanly without retaining state after release
    f9 = Key.f9
    listener._on_press(f9, injected=False)
    listener._on_release(f9, injected=False)
    assert triggered == ["start"]
    assert all(len(hk._state) == 0 for hk in listener._hotkeys)


def test_windows_dark_chrome_safe_noop_on_missing_handle_and_icon_resolves():
    assert apply_windows_dark_chrome(object()) is False
    fake_win = type("Win", (), {"native": type("Native", (), {"Handle": 0})()})()
    assert apply_windows_dark_chrome(fake_win) is False
    icon = resolve_icon_path()
    assert icon is not None and icon.endswith("icon.ico")
