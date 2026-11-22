"""Local JSON storage for Desktop settings and snippet library (%APPDATA%/TypeSimulator)."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from backend.models import Snippet, TypingConfig


def default_data_dir() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "TypeSimulator"
    return Path.home() / ".typesimulator"


def _seed_snippets() -> list[Snippet]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        Snippet(
            id="seed-1",
            title="VDI SSH Troubleshooting Block",
            text='sudo systemctl status sshd\njournalctl -u sshd --since "10 minutes ago"',
            tags=["VDI", "SSH"],
            created_at=now,
        ),
        Snippet(
            id="seed-2",
            title="QA Form Regression Payload",
            text="Alex Morgan\nalex.morgan@example.test\nRegression run: required fields and validation states.",
            tags=["QA", "Forms"],
            created_at=now,
        ),
        Snippet(
            id="seed-3",
            title="Live Demo Code Intro",
            text="// Let’s build this one careful keystroke at a time.\nconst ready = true;",
            tags=["Demo", "Code"],
            created_at=now,
        ),
    ]


class LocalStorage:
    """Atomic JSON persistence for TypingConfig and Snippets."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self._dir = Path(data_dir) if data_dir is not None else default_data_dir()
        self._config_path = self._dir / "config.json"
        self._snippets_path = self._dir / "snippets.json"

    def _ensure_dir(self) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)

    def _write_json_atomic(self, path: Path, payload: object) -> None:
        self._ensure_dir()
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, path)

    # --- Config ---

    def load_config(self) -> TypingConfig:
        if not self._config_path.exists():
            return TypingConfig()
        try:
            raw = json.loads(self._config_path.read_text(encoding="utf-8"))
            return TypingConfig.from_dict(raw)
        except Exception:
            return TypingConfig()

    def save_config(self, config: TypingConfig) -> None:
        self._write_json_atomic(self._config_path, config.to_dict())

    # --- Snippets ---

    def list_snippets(self) -> list[Snippet]:
        if not self._snippets_path.exists():
            seeded = _seed_snippets()
            self._write_json_atomic(self._snippets_path, [s.to_dict() for s in seeded])
            return seeded
        try:
            raw = json.loads(self._snippets_path.read_text(encoding="utf-8"))
            if not isinstance(raw, list):
                return []
            return [Snippet.from_dict(item) for item in raw if isinstance(item, dict)]
        except Exception:
            return []

    def save_snippet(self, title: str, text: str, tags: list[str]) -> Snippet:
        snippets = self.list_snippets()
        snippet = Snippet(
            id=str(uuid.uuid4()),
            title=title.strip() or "Untitled Snippet",
            text=text,
            tags=[t.strip() for t in tags if t.strip()],
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        updated = [snippet, *snippets]
        self._write_json_atomic(self._snippets_path, [s.to_dict() for s in updated])
        return snippet

    def delete_snippet(self, snippet_id: str) -> None:
        snippets = [s for s in self.list_snippets() if s.id != snippet_id]
        self._write_json_atomic(self._snippets_path, [s.to_dict() for s in snippets])
