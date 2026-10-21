"""Offline gateway catalog checks; Copilot retains its own authoritative validator."""

from __future__ import annotations

from datetime import date
import json
from pathlib import Path, PurePosixPath
import re


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_FIELDS = ('specs', 'workflows', 'entrypoints', 'code', 'tests', 'documentation')


def ordinary_file(root: Path, name: object) -> bool:
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or any(ord(c) < 32 for c in name):
        return False
    path = PurePosixPath(name)
    if path.is_absolute() or str(path) != name or any(p in {'.', '..', '.git'} for p in path.parts):
        return False
    candidate = root
    for part in path.parts:
        candidate /= part
        if candidate.is_symlink():
            return False
    return candidate.is_file()


def prose(source: str) -> str:
    source = re.sub(r'<!--.*?-->', '', source, flags=re.S)
    return re.sub(r'^(`{3,}|~{3,})[^\n]*\n.*?^\1[^\n]*(?:\n|$)', '', source, flags=re.M | re.S)


def numbered_sections(source: str, count: int) -> bool:
    content = prose(source)
    for number in range(1, count + 1):
        match = re.search(rf'^## {number}\. [^\n]+\n(.+?)(?=^## |\Z)', content, re.M | re.S)
        if match is None or not match.group(1).strip():
            return False
    return True


def valid_budget(source: str) -> bool:
    section = re.search(r'^## 14\.[^\n]*\n(.+?)(?=^## 15\.|\Z)', prose(source), re.M | re.S)
    if section is None:
        return False
    allocations, totals = [], []
    for label, number in re.findall(r'^\|\s*([^|]+)\|\s*([^|]+)\|', section.group(1), re.M):
        number = number.strip().replace('*', '').replace(',', '')
        if not number.isdigit():
            continue
        (totals if label.strip().replace('*', '').lower() == 'total' else allocations).append(int(number))
    return bool(allocations) and min(allocations) > 0 and totals == [sum(allocations)]


def validate_specifications(root: Path) -> list[str]:
    errors: list[str] = []
    if not ordinary_file(root, 'specs/catalog.json'):
        return ['Specification catalog is missing or unsafe.']
    try:
        catalog = json.loads((root / 'specs/catalog.json').read_text())
    except (ValueError, OSError):
        return ['Specification catalog could not be read.']
    if not isinstance(catalog, dict) or type(catalog.get('version')) is not int or catalog['version'] != 1:
        return ['Unsupported specification catalog schema.']
    capabilities = catalog.get('capabilities')
    if not isinstance(capabilities, list) or not capabilities:
        return ['Specification catalog must declare capabilities.']
    ids, titles, specs = set(), set(), set()
    for capability in capabilities:
        if not isinstance(capability, dict):
            errors.append('Capability must be an object.')
            continue
        for key, seen in [('id', ids), ('title', titles)]:
            value = capability.get(key)
            if not isinstance(value, str) or not value.strip() or value in seen:
                errors.append('Capability identity is missing or duplicated.')
            else:
                seen.add(value)
        for key in ['scope', 'owner', 'lastVerified']:
            if not isinstance(capability.get(key), str) or not capability[key].strip():
                errors.append('Capability metadata is incomplete.')
        try:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', capability.get('lastVerified', '')):
                raise ValueError('Invalid date format')
            date.fromisoformat(capability.get('lastVerified', ''))
        except (ValueError, TypeError):
            errors.append('Capability verification date is invalid.')
        if not isinstance(capability.get('status'), str) or capability['status'] not in {'as-built-baseline', 'implemented', 'proposed', 'deprecated'}:
            errors.append('Capability status is unsupported.')
        for field in EVIDENCE_FIELDS:
            values = capability.get(field)
            if not isinstance(values, list) or (field != 'workflows' and not values):
                errors.append('Capability evidence is incomplete.')
                continue
            if any(not isinstance(value, str) for value in values) or len(set(values)) != len(values):
                errors.append('Capability evidence is invalid or duplicated.')
                continue
            for name in values:
                if not ordinary_file(root, name):
                    errors.append('Capability evidence is missing or unsafe.')
                if field == 'workflows' and not (name.startswith('.github/workflows/') and name.endswith(('.yml', '.yaml'))):
                    errors.append('Workflow evidence is outside its boundary.')
                if field == 'specs':
                    if not name.startswith('specs/') or not name.endswith('.md') or name in specs:
                        errors.append('Specification ownership is invalid or duplicated.')
                    specs.add(name)
                    if ordinary_file(root, name):
                        source = (root / name).read_text()
                        if not numbered_sections(source, 20) or not valid_budget(source):
                            errors.append('Specification sections or numeric test budget are invalid.')
    for name, count in [('README.md', 8), ('_template.md', 20)]:
        name = 'specs/' + name
        if not ordinary_file(root, name) or not numbered_sections((root / name).read_text(), count):
            errors.append('Specification standard or template is incomplete.')
    standard = root / 'specs/README.md'
    if ordinary_file(root, 'specs/README.md') and 'A MUST requires an acceptance scenario.' not in prose(standard.read_text()).replace('`', ''):
        errors.append('Specification standard lacks the normative acceptance rule.')
    for path in (root / 'specs').rglob('*.md'):
        if path.name not in {'README.md', '_template.md', 'CATALOG.md'} and path.relative_to(root).as_posix() not in specs:
            errors.append('A specification has no registered capability owner.')
    return errors


def main() -> int:
    errors = validate_specifications(ROOT)
    for error in sorted(set(errors)):
        print(error)
    if not errors:
        print('Specification contracts verified.')
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
