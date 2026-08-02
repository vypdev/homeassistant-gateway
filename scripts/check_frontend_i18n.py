#!/usr/bin/env python3
"""Validate that every supported frontend locale has the complete translation key set."""
from __future__ import annotations

import re
from pathlib import Path


LANGUAGES = ("en", "es", "fr", "it", "de", "pt", "zh", "ja", "ru", "hi", "ar")
ROOT = Path(__file__).parents[1]
MAIN = ROOT / "frontend" / "src" / "main.ts"
EXTRA = ROOT / "frontend" / "src" / "i18n-extra.ts"


def keys_in_object(body: str) -> set[str]:
    return set(re.findall(r"\b([A-Za-z][A-Za-z0-9_]*)\s*:", body))


def main_locale_keys(source: str, language: str) -> set[str]:
    match = re.search(rf"^  {language}: \{{(?P<body>.*?)^  \}},?", source, re.MULTILINE | re.DOTALL)
    if match is None:
        raise ValueError(f"missing_locale:{language}")
    return keys_in_object(match.group("body"))


def extra_locale_keys(source: str, language: str) -> set[str]:
    if language in {"de", "pt", "it", "fr"}:
        start, end = source.index("const fragment0"), source.index("const fragment1")
        body = source[start:end]
        match = re.search(rf"\b{language}: \{{(?P<body>.*?)\n  \}},", body, re.DOTALL)
        return keys_in_object(match.group("body")) if match else set()
    if language in {"es", "zh", "ja", "ru"}:
        start, end = source.index("const fragment1"), source.index("const fragment2")
        body = source[start:end]
        match = re.search(rf"\b{language}: \{{(?P<body>.*?)\n  \}},", body, re.DOTALL)
        return keys_in_object(match.group("body")) if match else set()
    fragment = "fragment2" if language == "hi" else "fragment3" if language == "ar" else None
    if fragment is None:
        return set()
    start = source.index(f"const {fragment}")
    end = source.index("};", start)
    return keys_in_object(source[start:end])


def main() -> int:
    main_source = MAIN.read_text(encoding="utf-8")
    extra_source = EXTRA.read_text(encoding="utf-8")
    keys = {language: main_locale_keys(main_source, language) for language in LANGUAGES}
    for language in LANGUAGES:
        keys[language].update(extra_locale_keys(extra_source, language))
    missing = {language: sorted(keys["en"] - keys[language]) for language in LANGUAGES if language != "en" and keys["en"] - keys[language]}
    if missing:
        for language, items in missing.items():
            print(f"{language}: missing {len(items)} key(s): {', '.join(items)}")
        return 1
    print(f"i18n: {len(keys['en'])} keys present in {len(LANGUAGES)} locales")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
