"""Standalone PyWebView desktop entry point for TypeSimulator v2 with dark chrome, origin isolation & CSP."""

from __future__ import annotations

import ctypes
import mimetypes
import os
import sys
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Optional
from urllib.parse import unquote, urlsplit

from backend.bridge import DesktopBridge, STUDIO_SIZE, is_allowed_external_url

# Report-Only CSP delivered as a real HTTP response header by the loopback static server.
# Self-hosted fonts eliminate any external font CDN dependency.
DESKTOP_CSP_REPORT_ONLY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "font-src 'self'; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'; "
    "object-src 'none'"
)

_LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost"})

# Windows DWM attributes for native dark titlebar, caption color, border, and rounded corners
_DWMWA_USE_IMMERSIVE_DARK_MODE = 20
_DWMWA_WINDOW_CORNER_PREFERENCE = 33
_DWMWA_BORDER_COLOR = 34
_DWMWA_CAPTION_COLOR = 35
_DWMWCP_ROUND = 2


def apply_windows_dark_chrome(
    window: Any,
    caption_bgr: int = 0x000B0B0B,
    border_bgr: int = 0x00242424,
) -> bool:
    """Force native Windows 10/11 dark title bar & matching caption/border even in Windows Light Mode."""
    if sys.platform != "win32":
        return False
    native = getattr(window, "native", None)
    if native is None:
        return False
    handle_obj = getattr(native, "Handle", None)
    if handle_obj is None:
        return False

    try:
        hwnd = int(handle_obj.ToInt32()) if hasattr(handle_obj, "ToInt32") else int(handle_obj)
    except Exception:
        return False
    if hwnd == 0:
        return False

    try:
        dwmapi = ctypes.windll.dwmapi
        for attr, val in (
            (_DWMWA_USE_IMMERSIVE_DARK_MODE, 1),
            (_DWMWA_WINDOW_CORNER_PREFERENCE, _DWMWCP_ROUND),
            (_DWMWA_CAPTION_COLOR, caption_bgr),
            (_DWMWA_BORDER_COLOR, border_bgr),
        ):
            c_val = ctypes.c_int(val)
            dwmapi.DwmSetWindowAttribute(
                ctypes.c_void_p(hwnd),
                ctypes.c_uint(attr),
                ctypes.byref(c_val),
                ctypes.sizeof(c_val),
            )
        return True
    except Exception:
        return False


def validate_dev_url(raw_url: Optional[str], is_frozen: bool) -> Optional[str]:
    """Allow TYPESIM_DEV_URL only during non-frozen development and strictly on localhost/127.0.0.1."""
    if is_frozen or not raw_url:
        return None
    cleaned = raw_url.strip()
    if not cleaned:
        return None

    parsed = urlsplit(cleaned)
    if parsed.scheme != "http":
        raise ValueError("TYPESIM_DEV_URL must use http:// on localhost or 127.0.0.1.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("TYPESIM_DEV_URL must not contain credentials.")
    if (parsed.hostname or "").lower() not in _LOOPBACK_HOSTS:
        raise ValueError("TYPESIM_DEV_URL is restricted strictly to localhost or 127.0.0.1.")
    _ = parsed.port
    return cleaned


def is_debug_enabled(is_frozen: bool) -> bool:
    """DevTools debug flag is strictly ignored in packaged frozen executables."""
    if is_frozen:
        return False
    return os.environ.get("TYPESIM_DEBUG", "0") == "1"


def extract_origin(url: str) -> str:
    parsed = urlsplit(url)
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def is_allowed_app_navigation(uri: str, allowed_origin: str) -> bool:
    """Allow WebView navigation ONLY within the application's own loopback origin or about:blank."""
    raw = (uri or "").strip()
    if not raw:
        return False
    if raw.lower() == "about:blank":
        return True
    parsed = urlsplit(raw)
    if parsed.scheme.lower() not in ("http", "https"):
        return False
    return extract_origin(raw) == allowed_origin.lower()


def _runtime_base_dir() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent.parent


def resolve_frontend_dist_dir() -> Path:
    dist_dir = (_runtime_base_dir() / "frontend" / "dist").resolve()
    if not (dist_dir / "index.html").exists():
        raise FileNotFoundError(
            f"Frontend bundle not found at {dist_dir / 'index.html'}. "
            "Run 'npm run build:desktop' inside frontend/ first."
        )
    return dist_dir


def resolve_icon_path() -> Optional[str]:
    icon = (_runtime_base_dir() / "installer" / "assets" / "icon.ico").resolve()
    return str(icon) if icon.is_file() else None


class LocalStaticServer:
    """Loopback-only static HTTP server delivering real security headers & Report-Only CSP."""

    def __init__(self, dist_dir: Path) -> None:
        self._dist_dir = dist_dir.resolve()
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), self._make_handler())
        self._server.daemon_threads = True
        self._thread: Optional[threading.Thread] = None

    @property
    def origin(self) -> str:
        host, port = self._server.server_address[:2]
        return f"http://{host}:{port}"

    @property
    def index_url(self) -> str:
        return f"{self.origin}/index.html"

    def start(self) -> str:
        self._thread = threading.Thread(
            target=self._server.serve_forever,
            name="TypeSimulatorStaticServer",
            daemon=True,
        )
        self._thread.start()
        return self.index_url

    def stop(self) -> None:
        try:
            self._server.shutdown()
            self._server.server_close()
        except Exception:
            pass

    def _make_handler(self) -> type[BaseHTTPRequestHandler]:
        dist_dir = self._dist_dir

        class _StaticHandler(BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: Any) -> None:
                return

            def _send_security_headers(self) -> None:
                self.send_header("Content-Security-Policy-Report-Only", DESKTOP_CSP_REPORT_ONLY)
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("X-Frame-Options", "DENY")
                self.send_header("Referrer-Policy", "no-referrer")
                self.send_header(
                    "Permissions-Policy",
                    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
                )
                self.send_header("Cache-Control", "no-store")

            def _serve(self, head_only: bool = False) -> None:
                req_path = unquote(urlsplit(self.path).path)
                if req_path in ("", "/"):
                    rel_path = "index.html"
                else:
                    rel_path = req_path.lstrip("/")

                if ".." in Path(rel_path).parts or "\\" in rel_path:
                    self.send_response(HTTPStatus.FORBIDDEN)
                    self._send_security_headers()
                    self.end_headers()
                    return

                candidate = (dist_dir / rel_path).resolve()
                try:
                    candidate.relative_to(dist_dir)
                except ValueError:
                    self.send_response(HTTPStatus.FORBIDDEN)
                    self._send_security_headers()
                    self.end_headers()
                    return

                if not candidate.is_file():
                    self.send_response(HTTPStatus.NOT_FOUND)
                    self._send_security_headers()
                    self.end_headers()
                    return

                data = candidate.read_bytes()
                mime, _ = mimetypes.guess_type(str(candidate))
                content_type = mime or "application/octet-stream"
                if content_type.startswith("text/") or content_type in (
                    "application/javascript",
                    "application/json",
                ):
                    content_type = f"{content_type}; charset=utf-8"

                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(data)))
                self._send_security_headers()
                self.end_headers()
                if not head_only:
                    self.wfile.write(data)

            def do_GET(self) -> None:
                self._serve(head_only=False)

            def do_HEAD(self) -> None:
                self._serve(head_only=True)

        return _StaticHandler


def _attach_webview_navigation_guard(window: Any, allowed_origin: str, bridge: DesktopBridge) -> None:
    """Block any WebView2 navigation away from the app origin; open allowlisted links externally."""
    native = getattr(window, "native", None)
    wv = getattr(native, "webview", None) if native is not None else None
    if wv is None:
        return

    def _on_navigation_starting(sender: Any, args: Any) -> None:
        try:
            uri = str(args.Uri)
        except Exception:
            uri = ""
        if is_allowed_app_navigation(uri, allowed_origin):
            return
        try:
            args.Cancel = True
        except Exception:
            pass
        if is_allowed_external_url(uri):
            try:
                bridge.open_external_url(uri)
            except Exception:
                pass

    try:
        wv.NavigationStarting += _on_navigation_starting
    except Exception:
        pass


def main() -> None:
    import webview

    is_frozen = bool(getattr(sys, "frozen", False))
    dev_url = validate_dev_url(os.environ.get("TYPESIM_DEV_URL"), is_frozen=is_frozen)
    debug_mode = is_debug_enabled(is_frozen=is_frozen)

    webview.settings["ALLOW_FILE_URLS"] = False
    webview.settings["ALLOW_DOWNLOADS"] = False
    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = False

    static_server: Optional[LocalStaticServer] = None
    if dev_url is not None:
        url = dev_url
    else:
        dist_dir = resolve_frontend_dist_dir()
        static_server = LocalStaticServer(dist_dir)
        url = static_server.start()

    allowed_origin = extract_origin(url)
    bridge = DesktopBridge()

    window = webview.create_window(
        title="TypeSimulator",
        url=url,
        js_api=bridge,
        width=STUDIO_SIZE[0],
        height=STUDIO_SIZE[1],
        min_size=(460, 88),
        background_color="#090909",
        text_select=True,
    )

    guard_installed = False

    def _ensure_guard() -> None:
        nonlocal guard_installed
        if not guard_installed:
            _attach_webview_navigation_guard(window, allowed_origin, bridge)
            guard_installed = True

    def _on_before_show() -> None:
        apply_windows_dark_chrome(window)
        _ensure_guard()

    def _on_shown() -> None:
        apply_windows_dark_chrome(window)

    def _on_loaded() -> None:
        apply_windows_dark_chrome(window)
        _ensure_guard()
        bridge.attach_window(window)

    def _on_closed() -> None:
        bridge.shutdown()
        if static_server is not None:
            static_server.stop()

    window.events.before_show += _on_before_show
    window.events.shown += _on_shown
    window.events.loaded += _on_loaded
    window.events.closed += _on_closed

    webview.start(
        debug=debug_mode,
        gui="edgechromium" if sys.platform == "win32" else None,
        icon=resolve_icon_path(),
    )


if __name__ == "__main__":
    main()
