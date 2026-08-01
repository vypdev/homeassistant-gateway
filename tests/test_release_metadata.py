import pytest

from scripts.release_metadata import extract_release


def test_extracts_latest_release_notes() -> None:
    version, notes = extract_release(
        """# Changelog

## 0.2.0 - 2026-08-02

- New dashboard.

## [0.1.0]

- Initial release.
"""
    )

    assert version == "0.2.0"
    assert notes == "- New dashboard."


def test_extracts_requested_version() -> None:
    version, notes = extract_release("## v0.2.0\n\n- New\n\n## 0.1.0\n\n- Old\n", "0.1.0")

    assert version == "0.1.0"
    assert notes == "- Old"


def test_rejects_missing_notes() -> None:
    with pytest.raises(ValueError, match="has no release notes"):
        extract_release("## 0.2.0\n\n## 0.1.0\n\n- Old\n")
