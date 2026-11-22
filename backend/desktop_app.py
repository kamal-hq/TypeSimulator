"""Standalone PyWebView desktop entry point for TypeSimulator v2."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import webview

from backend.bridge import DesktopBridge, STUDIO_SIZE


def resolve_frontend_url() -> str:
    """Resolve Vite dev URL (if set) or bundled frontend/dist/index.html."""
    dev_url = os.environ.get("TYPESIM_DEV_URL")
    if dev_url:
        return dev_url

    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        base_dir = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    else:
        base_dir = Path(__file__).resolve().parent.parent

    index_path = base_dir / "frontend" / "dist" / "index.html"
    if not index_path.exists():
        raise FileNotFoundError(
            f"Frontend bundle not found at {index_path}. "
            "Run 'npm run build:desktop' inside frontend/ first."
        )
    return index_path.as_uri()


def main() -> None:
    bridge = DesktopBridge()
    url = resolve_frontend_url()

    window = webview.create_window(
        title="TypeSimulator v2 — Humanized Keystroke Studio",
        url=url,
        js_api=bridge,
        width=STUDIO_SIZE[0],
        height=STUDIO_SIZE[1],
        min_size=(460, 88),
        background_color="#090909",
        text_select=True,
    )

    def _on_loaded() -> None:
        bridge.attach_window(window)

    def _on_closed() -> None:
        bridge.shutdown()

    window.events.loaded += _on_loaded
    window.events.closed += _on_closed

    debug_mode = os.environ.get("TYPESIM_DEBUG", "0") == "1"
    webview.start(debug=debug_mode, gui="edgechromium" if sys.platform == "win32" else None)


if __name__ == "__main__":
    main()
