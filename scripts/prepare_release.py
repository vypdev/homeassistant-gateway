"""Prepare or verify the fixed gateway release metadata before publication."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import tomllib

import yaml

from scripts.release_metadata import extract_release


ROOT = Path(__file__).resolve().parents[1]
VERSION_DOCUMENTS = (
    'README.md',
    'addon-edge/README.md',
    'deploy/standalone/.env.example',
    'deploy/standalone/README.md',
    'docs/consumer/home-assistant-container.md',
    'docs/release-channels.md',
)
METADATA = ('addon/config.yaml', 'addon-edge/config.yaml', 'pyproject.toml', 'addon/CHANGELOG.md')
SEMVER = re.compile(r'(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})')


def version_tuple(version: str) -> tuple[int, int, int]:
    if not SEMVER.fullmatch(version):
        raise ValueError('Release version must use MAJOR.MINOR.PATCH without leading zeros.')
    return tuple(int(part) for part in version.split('.'))


def read_files(root: Path, names: tuple[str, ...]) -> dict[str, str]:
    sources = {}
    for name in names:
        path = root
        for part in Path(name).parts:
            path = path / part
            if path.is_symlink():
                raise ValueError('Release metadata must not use symbolic links.')
        if not path.is_file() or path.stat().st_nlink != 1 or path.stat().st_size > 1024 * 1024:
            raise ValueError('Required release metadata is missing or unsupported.')
        sources[name] = path.read_text(encoding='utf-8')
    return sources


def validate_sources(sources: dict[str, str], version: str) -> None:
    version_tuple(version)
    stable = yaml.safe_load(sources['addon/config.yaml'])
    edge = yaml.safe_load(sources['addon-edge/config.yaml'])
    package = tomllib.loads(sources['pyproject.toml'])
    changelog_version, _ = extract_release(sources['addon/CHANGELOG.md'])
    if not isinstance(stable, dict) or stable.get('version') != version:
        raise ValueError('Stable app version does not match the release.')
    if not isinstance(edge, dict) or not re.fullmatch(
        re.escape(version) + r'-edge-[1-9][0-9]*', str(edge.get('version', ''))
    ):
        raise ValueError('Edge version does not match the stable release.')
    project = package.get('project')
    if not isinstance(project, dict) or project.get('version') != version or changelog_version != version:
        raise ValueError('Package and changelog versions must match the release.')


def validate_release(root: Path, version: str) -> None:
    validate_sources(read_files(root, METADATA), version)


def validate_preparation_ref(branch: str, prefix: str, version: str) -> None:
    version_tuple(version)
    if (not prefix or not re.fullmatch(r'[A-Za-z0-9_/-]+', prefix)
        or any(part in {'', '.', '..'} for part in prefix.split('/'))
        or branch != f'{prefix}/{version}'):
        raise ValueError('Release preparation requires its managed version branch.')


def prepare_release(root: Path, version: str, notes: str) -> list[str]:
    requested = version_tuple(version)
    if not notes.strip() or len(notes) > 50000 or re.search(r'^##\s+\[?v?\d+\.\d+\.\d+', notes, re.M):
        raise ValueError('Release notes must be bounded, nonempty and contain no release headings.')
    sources = read_files(root, METADATA + VERSION_DOCUMENTS)
    current, previous_notes = extract_release(sources['addon/CHANGELOG.md'])
    validate_sources(sources, current)
    if requested < version_tuple(current):
        raise ValueError('Release preparation cannot downgrade the current version.')
    if version == current:
        if notes.strip() != previous_notes:
            raise ValueError('A prepared release cannot replace existing notes.')
        return []

    prepared = dict(sources)
    old_edge = str(yaml.safe_load(sources['addon-edge/config.yaml'])['version'])
    for name, value in [('addon/config.yaml', version), ('addon-edge/config.yaml', f'{version}-edge-1')]:
        prepared[name], count = re.subn(r'^version:[^\n]*$', f'version: "{value}"', sources[name], flags=re.M)
        if count != 1:
            raise ValueError('App metadata must contain exactly one version field.')
    prepared['pyproject.toml'], count = re.subn(
        r'^version[ \t]*=[^\n]*$', f'version = "{version}"', sources['pyproject.toml'], flags=re.M
    )
    if count != 1:
        raise ValueError('Package metadata must contain exactly one version field.')
    changelog = sources['addon/CHANGELOG.md']
    heading = re.search(r'^##\s', changelog, re.M)
    if heading is None:
        raise ValueError('Changelog has no release section.')
    prepared['addon/CHANGELOG.md'] = (
        changelog[:heading.start()] + f'## {version}\n\n{notes.strip()}\n\n' + changelog[heading.start():]
    )
    for name in VERSION_DOCUMENTS:
        text = sources[name].replace(old_edge, f'{version}-edge-1')
        prepared[name] = re.sub(rf'(?<![0-9]){re.escape(current)}(?![0-9])', version, text)
    validate_sources(prepared, version)
    changed = [name for name, text in prepared.items() if text != sources[name]]
    for name in changed:
        (root / name).write_text(prepared[name], encoding='utf-8')
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--version', default=os.environ.get('RELEASE_VERSION', ''))
    args = parser.parse_args()
    try:
        if args.check:
            validate_release(ROOT, args.version)
        else:
            validate_preparation_ref(os.environ.get('GITHUB_REF_NAME', ''),
                                     os.environ.get('RELEASE_BRANCH_PREFIX', ''),
                                     args.version)
            prepare_release(ROOT, args.version, os.environ.get('RELEASE_CHANGELOG', ''))
    except (ValueError, OSError, yaml.YAMLError):
        # Fixed messages only: repository contents and provider input are never echoed.
        print('Release metadata validation failed; review the version, notes and required files.')
        return 1
    print('Release metadata verified.' if args.check else 'Release metadata prepared.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
