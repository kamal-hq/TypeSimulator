"""Unit tests for backend.hotkeys normalization and lifecycle."""

import pytest

from backend.hotkeys import GlobalHotkeyManager, normalize_hotkey_to_pynput
from backend.models import HotkeyBindings


class FakeListener:
    def __init__(self, mapping):
        self.mapping = mapping
        self.daemon = False
        self.started = False
        self.stopped = False

    def start(self):
        self.started = True

    def stop(self):
        self.stopped = True


def test_normalize_hotkey_to_pynput():
    assert normalize_hotkey_to_pynput("F9") == "<f9>"
    assert normalize_hotkey_to_pynput("Ctrl+Shift+Esc") == "<ctrl>+<shift>+<esc>"
    assert normalize_hotkey_to_pynput("Alt + Shift + S") == "<alt>+<shift>+s"

    with pytest.raises(ValueError):
        normalize_hotkey_to_pynput("")
    with pytest.raises(ValueError):
        normalize_hotkey_to_pynput("Ctrl+NotARealKey")


def test_hotkey_manager_rebind_and_teardown():
    created: list[FakeListener] = []

    def factory(mapping):
        listener = FakeListener(mapping)
        created.append(listener)
        return listener

    mgr = GlobalHotkeyManager(listener_factory=factory)
    err = mgr.start(HotkeyBindings(), lambda: None, lambda: None, lambda: None)
    assert err is None
    assert len(created) == 1
    assert created[0].started is True
    assert "<f9>" in created[0].mapping
    assert "<ctrl>+<shift>+<esc>" in created[0].mapping

    # Duplicate bindings must fail cleanly without crashing
    dup_err = mgr.rebind(HotkeyBindings(start_resume="F9", pause="F9", abort="F11"))
    assert dup_err is not None

    # Valid rebind stops previous listener and starts new one
    rebind_err = mgr.rebind(HotkeyBindings(start_resume="F8", pause="F10", abort="Ctrl+Alt+X"))
    assert rebind_err is None
    assert created[0].stopped is True
    assert len(created) == 2
    assert created[1].started is True
    assert "<f8>" in created[1].mapping

    mgr.stop()
    assert created[1].stopped is True
