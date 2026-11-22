"""Win32 ctypes active-window focus guard with zero external C dependencies."""

from __future__ import annotations

import ctypes
import sys
from typing import Protocol


class WindowMonitor(Protocol):
    def get_active_window(self) -> tuple[int, str]:
        """Return (window_handle, window_title) for the current foreground window."""
        ...

    def is_elevated(self) -> bool:
        """Return True if the current process runs with Administrator privileges."""
        ...


class Win32WindowMonitor:
    """Windows foreground HWND tracker using stdlib ctypes (user32 + shell32)."""

    def get_active_window(self) -> tuple[int, str]:
        if sys.platform != "win32":
            return (0, "")
        try:
            user32 = ctypes.windll.user32
            hwnd = int(user32.GetForegroundWindow())
            if hwnd == 0:
                return (0, "")
            length = int(user32.GetWindowTextLengthW(hwnd))
            if length <= 0:
                return (hwnd, "")
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            return (hwnd, buf.value.strip())
        except Exception:
            return (0, "")

    def is_elevated(self) -> bool:
        if sys.platform != "win32":
            return False
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
