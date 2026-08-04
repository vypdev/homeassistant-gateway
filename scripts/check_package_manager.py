"""Enforce the repository JavaScript package-manager policy."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]
PACKAGE = ROOT / "frontend" / "package.json"
FORBIDDEN_COMMAND = re.compile(r"\b(?:npm|npx)\s+(?:ci|install|run|exec|create|test|start|build|init|publish|pack)\b")
FORBIDDEN_LOCKFILES = {"package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lockb"}
TEXT_SUFFIXES = {".md", ".mjs", ".ts", ".js", ".py", ".yml", ".yaml", ".json", ".toml", ".sh", ".Dockerfile"}
EXCLUDED_PATHS = {"frontend/pnpm-lock.yaml"}


def tracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [ROOT / line for line in result.stdout.splitlines() if line]


def main() -> int:
    package = json.loads(PACKAGE.read_text(encoding="utf-8"))
    expected = "pnpm@11.15.1"
    if package.get("packageManager") != expected:
        print(f"frontend/package.json must declare packageManager={expected!r}")
        return 1

    violations: list[str] = []
    for path in tracked_files():
        if not path.exists():
            continue
        relative = path.relative_to(ROOT).as_posix()
        if path.name in FORBIDDEN_LOCKFILES:
            violations.append(f"{relative}: forbidden lockfile")
            continue
        if relative in EXCLUDED_PATHS or path.suffix not in TEXT_SUFFIXES:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for line_number, line in enumerate(content.splitlines(), 1):
            if FORBIDDEN_COMMAND.search(line):
                violations.append(f"{relative}:{line_number}: {line.strip()}")

    if violations:
        print("forbidden npm/npx project commands detected:")
        print("\n".join(violations))
        return 1
    print("package-manager policy: pnpm only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
