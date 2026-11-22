"""Shared typed data models aligned 1:1 with frontend/src/types/engine.ts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional

EngineState = Literal["IDLE", "COUNTDOWN", "TYPING", "PAUSED", "COMPLETED", "ABORTED"]
CadencePreset = Literal["Natural", "Fast", "Thoughtful", "Steady", "Custom"]
NewlineMode = Literal["enter", "shift-enter"]
TabMode = Literal["4-spaces", "2-spaces", "strip", "send-tab"]

VALID_PRESETS: tuple[str, ...] = ("Natural", "Fast", "Thoughtful", "Steady", "Custom")
VALID_NEWLINES: tuple[str, ...] = ("enter", "shift-enter")
VALID_TABS: tuple[str, ...] = ("4-spaces", "2-spaces", "strip", "send-tab")


def _clamp_int(value: Any, low: int, high: int, default: int) -> int:
    try:
        parsed = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, parsed))


@dataclass
class HotkeyBindings:
    start_resume: str = "F9"
    pause: str = "F10"
    abort: str = "Ctrl+Shift+Esc"

    def to_dict(self) -> dict[str, str]:
        return {
            "startResume": self.start_resume,
            "pause": self.pause,
            "abort": self.abort,
        }

    @classmethod
    def from_dict(cls, data: Optional[dict[str, Any]]) -> "HotkeyBindings":
        if not isinstance(data, dict):
            return cls()
        return cls(
            start_resume=str(data.get("startResume") or data.get("start_resume") or "F9").strip() or "F9",
            pause=str(data.get("pause") or "F10").strip() or "F10",
            abort=str(data.get("abort") or "Ctrl+Shift+Esc").strip() or "Ctrl+Shift+Esc",
        )


@dataclass
class TypingConfig:
    preset: CadencePreset = "Natural"
    target_wpm: int = 68
    variability: int = 34
    countdown: int = 3
    typos_enabled: bool = True
    error_rate: int = 2
    newlines: NewlineMode = "enter"
    tabs: TabMode = "4-spaces"
    strip_markdown: bool = False
    clear_on_complete: bool = False
    focus_guard: bool = True
    hotkeys: HotkeyBindings = field(default_factory=HotkeyBindings)

    def to_dict(self) -> dict[str, Any]:
        return {
            "preset": self.preset,
            "targetWpm": self.target_wpm,
            "variability": self.variability,
            "countdown": self.countdown,
            "typosEnabled": self.typos_enabled,
            "errorRate": self.error_rate,
            "newlines": self.newlines,
            "tabs": self.tabs,
            "stripMarkdown": self.strip_markdown,
            "clearOnComplete": self.clear_on_complete,
            "focusGuard": self.focus_guard,
            "hotkeys": self.hotkeys.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: Optional[dict[str, Any]]) -> "TypingConfig":
        if not isinstance(data, dict):
            return cls()

        preset_raw = str(data.get("preset", "Natural"))
        preset: CadencePreset = preset_raw if preset_raw in VALID_PRESETS else "Natural"  # type: ignore[assignment]

        newlines_raw = str(data.get("newlines", "enter"))
        newlines: NewlineMode = newlines_raw if newlines_raw in VALID_NEWLINES else "enter"  # type: ignore[assignment]

        tabs_raw = str(data.get("tabs", "4-spaces"))
        tabs: TabMode = tabs_raw if tabs_raw in VALID_TABS else "4-spaces"  # type: ignore[assignment]

        return cls(
            preset=preset,
            target_wpm=_clamp_int(data.get("targetWpm", data.get("target_wpm", 68)), 25, 150, 68),
            variability=_clamp_int(data.get("variability", 34), 0, 100, 34),
            countdown=_clamp_int(data.get("countdown", 3), 0, 5, 3),
            typos_enabled=bool(data.get("typosEnabled", data.get("typos_enabled", True))),
            error_rate=_clamp_int(data.get("errorRate", data.get("error_rate", 2)), 0, 8, 2),
            newlines=newlines,
            tabs=tabs,
            strip_markdown=bool(data.get("stripMarkdown", data.get("strip_markdown", False))),
            clear_on_complete=bool(data.get("clearOnComplete", data.get("clear_on_complete", False))),
            focus_guard=bool(data.get("focusGuard", data.get("focus_guard", True))),
            hotkeys=HotkeyBindings.from_dict(data.get("hotkeys")),
        )

    def merged_with(self, patch: dict[str, Any]) -> "TypingConfig":
        base = self.to_dict()
        for key, value in patch.items():
            if key == "hotkeys" and isinstance(value, dict):
                merged_hk = dict(base["hotkeys"])
                merged_hk.update(value)
                base["hotkeys"] = merged_hk
            else:
                base[key] = value
        return TypingConfig.from_dict(base)


@dataclass
class SanitizeBreakdown:
    smart_quotes: int = 0
    dashes: int = 0
    ellipses: int = 0
    nbsp: int = 0
    zero_width: int = 0
    bullets: int = 0
    line_endings: int = 0

    @property
    def total(self) -> int:
        return (
            self.smart_quotes
            + self.dashes
            + self.ellipses
            + self.nbsp
            + self.zero_width
            + self.bullets
            + self.line_endings
        )

    def to_dict(self) -> dict[str, int]:
        return {
            "smartQuotes": self.smart_quotes,
            "dashes": self.dashes,
            "ellipses": self.ellipses,
            "nbsp": self.nbsp,
            "zeroWidth": self.zero_width,
            "bullets": self.bullets,
            "lineEndings": self.line_endings,
        }


@dataclass
class SanitizeResult:
    original: str
    sanitized: str
    breakdown: SanitizeBreakdown

    @property
    def total_artifacts(self) -> int:
        return self.breakdown.total

    def to_dict(self) -> dict[str, Any]:
        return {
            "original": self.original,
            "sanitized": self.sanitized,
            "totalArtifacts": self.total_artifacts,
            "breakdown": self.breakdown.to_dict(),
        }


@dataclass
class EngineSnapshot:
    state: EngineState = "IDLE"
    cursor: int = 0
    total: int = 0
    output: str = ""
    live_wpm: int = 0
    eta_seconds: int = 0
    countdown_remaining: int = 0
    typo_corrections: int = 0
    pause_reason: Optional[str] = None
    target_window_title: Optional[str] = None
    wpm_history: list[int] = field(default_factory=list)
    error_message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "state": self.state,
            "cursor": self.cursor,
            "total": self.total,
            "output": self.output,
            "liveWpm": self.live_wpm,
            "etaSeconds": self.eta_seconds,
            "countdownRemaining": self.countdown_remaining,
            "typoCorrections": self.typo_corrections,
            "wpmHistory": list(self.wpm_history),
        }
        if self.pause_reason is not None:
            payload["pauseReason"] = self.pause_reason
        if self.target_window_title is not None:
            payload["targetWindowTitle"] = self.target_window_title
        if self.error_message is not None:
            payload["errorMessage"] = self.error_message
        return payload


@dataclass
class Snippet:
    id: str
    title: str
    text: str
    tags: list[str]
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "text": self.text,
            "tags": list(self.tags),
            "createdAt": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Snippet":
        return cls(
            id=str(data.get("id", "")),
            title=str(data.get("title", "Untitled")),
            text=str(data.get("text", "")),
            tags=[str(t) for t in (data.get("tags") or [])],
            created_at=str(data.get("createdAt", data.get("created_at", ""))),
        )
