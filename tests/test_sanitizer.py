"""Unit tests for backend.sanitizer."""

from backend.models import TypingConfig
from backend.sanitizer import sanitize_text


def test_sanitize_normalizes_all_rich_text_artifacts():
    raw = "“Hello” ‘world’ — test–dash…\u00a0zero\u200bwidth\r\n• Bullet item\rEnd"
    result = sanitize_text(raw)

    assert result.sanitized == '"Hello" \'world\' - test-dash... zerowidth\n- Bullet item\nEnd'
    assert result.breakdown.smart_quotes == 4
    assert result.breakdown.dashes == 2
    assert result.breakdown.ellipses == 1
    assert result.breakdown.nbsp == 1
    assert result.breakdown.zero_width == 1
    assert result.breakdown.bullets == 1
    assert result.breakdown.line_endings == 2
    assert result.total_artifacts == 12


def test_sanitize_tab_modes():
    raw = "a\tb"
    assert sanitize_text(raw, TypingConfig(tabs="4-spaces")).sanitized == "a    b"
    assert sanitize_text(raw, TypingConfig(tabs="2-spaces")).sanitized == "a  b"
    assert sanitize_text(raw, TypingConfig(tabs="strip")).sanitized == "ab"
    assert sanitize_text(raw, TypingConfig(tabs="send-tab")).sanitized == "a\tb"


def test_sanitize_markdown_stripping_optional():
    raw = "# Heading\n**Bold** and *italic* with `code` and ~~strike~~"
    kept = sanitize_text(raw, TypingConfig(strip_markdown=False))
    stripped = sanitize_text(raw, TypingConfig(strip_markdown=True))

    assert "**Bold**" in kept.sanitized
    assert stripped.sanitized == "Heading\nBold and italic with code and strike"


def test_sanitize_clean_ascii_reports_zero_artifacts():
    raw = "Plain ASCII line 1\nPlain ASCII line 2."
    result = sanitize_text(raw)
    assert result.sanitized == raw
    assert result.total_artifacts == 0
