"""Rule-based text sanitizer with structured artifact diff breakdown."""

from __future__ import annotations

import re
from typing import Optional

from backend.models import SanitizeBreakdown, SanitizeResult, TypingConfig

_DOUBLE_SMART_QUOTES = re.compile(r"[“”„‟]")
_SINGLE_SMART_QUOTES = re.compile(r"[‘’‚‛]")
_DASHES = re.compile(r"[—–−]")
_ELLIPSES = re.compile(r"…")
_NBSP_SPACES = re.compile(r"[\u00a0\u2000-\u200a\u202f\u205f\u3000]")
_ZERO_WIDTH = re.compile(r"[\u200b-\u200d\ufeff\u2060]")
_BULLETS = re.compile(r"[•◦▪▫]\s*")
_LINE_ENDINGS = re.compile(r"\r\n|\r")

# Markdown stripping patterns (applied only when strip_markdown=True)
_MD_HEADING = re.compile(r"^(#{1,6})\s+", re.MULTILINE)
_MD_BOLD_ITALIC = re.compile(r"(\*\*\*|___)(.+?)\1")
_MD_BOLD = re.compile(r"(\*\*|__)(.+?)\1")
_MD_ITALIC = re.compile(r"(?<!\w)(\*|_)(.+?)\1(?!\w)")
_MD_STRIKE = re.compile(r"~~(.+?)~~")
_MD_CODE = re.compile(r"`([^`]+)`")


def _strip_markdown(text: str) -> str:
    text = _MD_HEADING.sub("", text)
    text = _MD_BOLD_ITALIC.sub(r"\2", text)
    text = _MD_BOLD.sub(r"\2", text)
    text = _MD_ITALIC.sub(r"\2", text)
    text = _MD_STRIKE.sub(r"\1", text)
    text = _MD_CODE.sub(r"\1", text)
    return text


def sanitize_text(text: str, config: Optional[TypingConfig] = None) -> SanitizeResult:
    """Normalize rich-text artifacts into OS-safe ASCII/UTF-8 text with diff stats."""
    cfg = config or TypingConfig()
    original = text

    text, dq_count = _DOUBLE_SMART_QUOTES.subn('"', text)
    text, sq_count = _SINGLE_SMART_QUOTES.subn("'", text)
    text, dash_count = _DASHES.subn("-", text)
    text, ellipsis_count = _ELLIPSES.subn("...", text)
    text, nbsp_count = _NBSP_SPACES.subn(" ", text)
    text, zw_count = _ZERO_WIDTH.subn("", text)
    text, bullet_count = _BULLETS.subn("- ", text)
    text, cr_count = _LINE_ENDINGS.subn("\n", text)

    if cfg.strip_markdown:
        text = _strip_markdown(text)

    if cfg.tabs == "4-spaces":
        text = text.replace("\t", "    ")
    elif cfg.tabs == "2-spaces":
        text = text.replace("\t", "  ")
    elif cfg.tabs == "strip":
        text = text.replace("\t", "")
    # "send-tab" preserves literal "\t" so the typing engine sends Key.tab

    breakdown = SanitizeBreakdown(
        smart_quotes=dq_count + sq_count,
        dashes=dash_count,
        ellipses=ellipsis_count,
        nbsp=nbsp_count,
        zero_width=zw_count,
        bullets=bullet_count,
        line_endings=cr_count,
    )
    return SanitizeResult(original=original, sanitized=text, breakdown=breakdown)
