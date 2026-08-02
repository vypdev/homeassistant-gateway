"""Run the frontend translation coverage and runtime helper gates together."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]
FRONTEND = ROOT / "frontend"


def main() -> int:
    from check_frontend_i18n import main as check_catalogs

    if check_catalogs() != 0:
        return 1

    sources = [
        FRONTEND / "src" / "main.ts",
        FRONTEND / "src" / "i18n-extra.ts",
        FRONTEND / "src" / "i18n-development.ts",
        FRONTEND / "src" / "i18n-development-extra.ts",
        FRONTEND / "src" / "i18n-ui.ts",
        FRONTEND / "src" / "i18n-ui-extra.ts",
        FRONTEND / "src" / "i18n-final.ts",
    ]
    empty_values: list[str] = []
    for path in sources:
        source = path.read_text(encoding="utf-8")
        empty_values.extend(f"{path.name}:{line}" for line in source.splitlines() if re.search(r"^\s+[A-Za-z][A-Za-z0-9_]*\s*:\s*(['\"]{2}|`{2})", line))
    if empty_values:
        print("empty frontend translation values:")
        print("\n".join(empty_values))
        return 1

    result = subprocess.run(
        ["npm", "run", "test:runtime"],
        cwd=FRONTEND,
        check=False,
        text=True,
    )
    if result.returncode != 0:
        return result.returncode
    print("i18n runtime: all locale keys non-empty and helper resolution passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
