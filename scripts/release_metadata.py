#!/usr/bin/env python3
"""Extract a semantic version and its release notes from a Keep-a-Changelog file."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

VERSION_HEADING = re.compile(
    r"^##\s+\[?v?(?P<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?(?:\s+-\s+.*)?$"
)


def extract_release(changelog: str, requested_version: str | None = None) -> tuple[str, str]:
    lines = changelog.splitlines()
    releases: list[tuple[str, int]] = []
    for index, line in enumerate(lines):
        match = VERSION_HEADING.match(line.strip())
        if match:
            releases.append((match.group("version"), index))

    if not releases:
        raise ValueError("CHANGELOG.md does not contain a semantic-version heading")

    version, start = releases[0] if requested_version is None else next(
        ((candidate, index) for candidate, index in releases if candidate == requested_version),
        ("", -1),
    )
    if start < 0:
        raise ValueError(f"version {requested_version!r} is not present in CHANGELOG.md")

    end = next((index for _, index in releases if index > start), len(lines))
    notes = "\n".join(lines[start + 1 : end]).strip()
    if not notes:
        raise ValueError(f"version {version} has no release notes")
    return version, notes


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("changelog", type=Path)
    parser.add_argument("--version")
    parser.add_argument("--output", choices=("version", "notes", "json"), default="json")
    args = parser.parse_args()

    version, notes = extract_release(args.changelog.read_text(encoding="utf-8"), args.version)
    if args.output == "version":
        print(version)
    elif args.output == "notes":
        print(notes)
    else:
        import json

        print(json.dumps({"version": version, "notes": notes}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
