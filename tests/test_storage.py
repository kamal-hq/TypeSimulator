"""Unit tests for backend.storage persistence."""

from backend.models import HotkeyBindings, TypingConfig
from backend.storage import LocalStorage


def test_config_roundtrip_and_clamping(tmp_path):
    store = LocalStorage(data_dir=tmp_path)
    default_cfg = store.load_config()
    assert default_cfg.target_wpm == 68
    assert default_cfg.hotkeys.abort == "Ctrl+Shift+Esc"

    custom = TypingConfig(
        preset="Fast",
        target_wpm=112,
        variability=22,
        countdown=2,
        typos_enabled=False,
        newlines="shift-enter",
        tabs="2-spaces",
        hotkeys=HotkeyBindings(start_resume="F8", pause="F11", abort="Ctrl+Alt+X"),
    )
    store.save_config(custom)

    loaded = store.load_config()
    assert loaded.to_dict() == custom.to_dict()

    # Clamping bounds check
    clamped = TypingConfig.from_dict({"targetWpm": 999, "errorRate": -5, "countdown": 42})
    assert clamped.target_wpm == 150
    assert clamped.error_rate == 0
    assert clamped.countdown == 5


def test_snippets_seed_save_and_delete(tmp_path):
    store = LocalStorage(data_dir=tmp_path)
    seeded = store.list_snippets()
    assert len(seeded) == 3

    created = store.save_snippet("Deploy Check", "kubectl get pods", ["K8s", "Ops"])
    all_snippets = store.list_snippets()
    assert len(all_snippets) == 4
    assert all_snippets[0].id == created.id
    assert all_snippets[0].title == "Deploy Check"

    store.delete_snippet(created.id)
    assert len(store.list_snippets()) == 3
