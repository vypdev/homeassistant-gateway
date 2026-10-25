"""Release preparation must be bounded, repeatable and safe before publication."""

from pathlib import Path
import shutil
import tomllib

import pytest
import yaml

from scripts.prepare_release import (
    METADATA,
    VERSION_DOCUMENTS,
    prepare_release,
    validate_release,
    validate_preparation_ref,
    version_tuple,
)
from scripts.release_metadata import extract_release


ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def repository_release_root(tmp_path: Path) -> Path:
    for name in METADATA + VERSION_DOCUMENTS:
        target = tmp_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    return tmp_path


@pytest.fixture
def release_root(tmp_path: Path) -> Path:
    files = {
        'addon/config.yaml': 'version: "0.5.35"\nslug: gateway\n',
        'addon-edge/config.yaml': 'version: "0.5.35-edge-1"\nslug: gateway_edge\n',
        'addon/CHANGELOG.md': '# Changelog\n\n## 0.5.35\n\n- Previous release.\n',
        'pyproject.toml': '[project]\nname = "gateway"\nversion = "0.5.35"\n',
        **{name: 'Stable 0.5.35; Edge 0.5.35-edge-1\n' for name in VERSION_DOCUMENTS},
    }
    for name, content in files.items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    return tmp_path


def snapshot(root: Path) -> dict[str, bytes]:
    return {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()}


def test_repository_release_metadata_matches_current_changelog() -> None:
    current, _ = extract_release((ROOT / 'addon/CHANGELOG.md').read_text())
    validate_release(ROOT, current)


def test_repository_copy_prepares_next_patch_and_replays_without_changing_checkout(
    repository_release_root: Path,
) -> None:
    source_before = {name: (ROOT / name).read_bytes() for name in METADATA + VERSION_DOCUMENTS}
    current, current_notes = extract_release((repository_release_root / 'addon/CHANGELOG.md').read_text())
    major, minor, patch = version_tuple(current)
    next_version = f'{major}.{minor}.{patch + 1}'
    notes = '- Verify release preparation against the checked-out repository.'

    changed = prepare_release(repository_release_root, next_version, notes)

    assert set(METADATA) <= set(changed)
    validate_release(repository_release_root, next_version)
    changelog = (repository_release_root / 'addon/CHANGELOG.md').read_text()
    assert extract_release(changelog) == (next_version, notes)
    assert extract_release(changelog, current) == (current, current_notes)
    prepared = snapshot(repository_release_root)
    assert prepare_release(repository_release_root, next_version, notes) == []
    assert snapshot(repository_release_root) == prepared
    assert {name: (ROOT / name).read_bytes() for name in source_before} == source_before


@pytest.mark.parametrize('name', METADATA)
def test_repository_copy_rejects_metadata_drift_without_partial_preparation(
    repository_release_root: Path, name: str,
) -> None:
    current, _ = extract_release((repository_release_root / 'addon/CHANGELOG.md').read_text())
    major, minor, patch = version_tuple(current)
    next_version = f'{major}.{minor}.{patch + 1}'
    path = repository_release_root / name
    original = path.read_text()
    if name == 'pyproject.toml':
        old_version = tomllib.loads(original)['project']['version']
    elif name.endswith('config.yaml'):
        old_version = str(yaml.safe_load(original)['version'])
    else:
        old_version = current
    replacement = f'{next_version}-edge-1' if name == 'addon-edge/config.yaml' else next_version
    corrupted = original.replace(old_version, replacement, 1)
    assert corrupted != original
    path.write_text(corrupted)
    before = snapshot(repository_release_root)

    with pytest.raises(ValueError):
        prepare_release(repository_release_root, next_version, '- Must reject inconsistent metadata.')

    assert snapshot(repository_release_root) == before


def test_prepare_updates_stable_edge_package_changelog_and_pinned_examples(release_root: Path) -> None:
    changed = prepare_release(release_root, '0.5.36', '- Verified improvement.')
    validate_release(release_root, '0.5.36')
    assert 'addon/config.yaml' in changed
    assert 'version: "0.5.36-edge-1"' in (release_root / 'addon-edge/config.yaml').read_text()
    changelog = (release_root / 'addon/CHANGELOG.md').read_text()
    assert changelog.index('## 0.5.36') < changelog.index('## 0.5.35')
    assert '0.5.36-edge-1' in (release_root / VERSION_DOCUMENTS[0]).read_text()


def test_prepare_replay_is_a_noop(release_root: Path) -> None:
    prepare_release(release_root, '0.5.36', '- Verified improvement.')
    original = snapshot(release_root)
    assert prepare_release(release_root, '0.5.36', '- Verified improvement.') == []
    assert snapshot(release_root) == original


@pytest.mark.parametrize('version', ['latest', 'v0.5.36', '0.5', '01.2.3', '0.5.36-edge-1', '1.2.3\n4.5.6'])
def test_invalid_release_version_never_changes_files(release_root: Path, version: str) -> None:
    original = snapshot(release_root)
    with pytest.raises(ValueError):
        prepare_release(release_root, version, '- Notes.')
    assert snapshot(release_root) == original


@pytest.mark.parametrize('notes', ['', '   ', 'x' * 50001, '- Good\n\n## 99.0.0\n\n- Forged section.'])
def test_invalid_notes_never_change_files(release_root: Path, notes: str) -> None:
    original = snapshot(release_root)
    with pytest.raises(ValueError):
        prepare_release(release_root, '0.5.36', notes)
    assert snapshot(release_root) == original


def test_release_downgrade_is_rejected(release_root: Path) -> None:
    original = snapshot(release_root)
    with pytest.raises(ValueError):
        prepare_release(release_root, '0.5.34', '- Older release.')
    assert snapshot(release_root) == original


def test_replay_cannot_replace_existing_release_notes(release_root: Path) -> None:
    original = snapshot(release_root)
    with pytest.raises(ValueError):
        prepare_release(release_root, '0.5.35', '- Changed historical notes.')
    assert snapshot(release_root) == original


def test_missing_required_metadata_prevents_partial_preparation(release_root: Path) -> None:
    (release_root / 'pyproject.toml').unlink()
    original = snapshot(release_root)
    with pytest.raises(ValueError):
        prepare_release(release_root, '0.5.36', '- Notes.')
    assert snapshot(release_root) == original


def test_symlinked_metadata_is_not_read_or_overwritten(release_root: Path, tmp_path: Path) -> None:
    target = tmp_path / 'external.yaml'
    target.write_text('version: "0.5.35"\n')
    path = release_root / 'addon/config.yaml'
    path.unlink()
    path.symlink_to(target)
    with pytest.raises(ValueError):
        prepare_release(release_root, '0.5.36', '- Notes.')
    assert target.read_text() == 'version: "0.5.35"\n'


def test_publisher_rejects_a_tag_that_does_not_match_package_metadata(release_root: Path) -> None:
    (release_root / 'pyproject.toml').write_text('[project]\nversion = "0.5.34"\n')
    with pytest.raises(ValueError):
        validate_release(release_root, '0.5.35')


@pytest.mark.parametrize('branch,prefix,version', [
    ('master', 'release', '0.5.36'),
    ('release/0.5.37', 'release', '0.5.36'),
    ('feature/12-title', 'release', '0.5.36'),
    ('release/0.5.36', '', '0.5.36'),
    ('release/0.5.36', 'release', 'invalid'),
    ('release/12-v0.5.36', 'release', '0.5.36'),
])
def test_preparation_cannot_write_an_unrelated_branch(branch, prefix, version) -> None:
    with pytest.raises(ValueError):
        validate_preparation_ref(branch, prefix, version)


def test_preparation_accepts_copilot_version_branches() -> None:
    validate_preparation_ref('release/0.5.36', 'release', '0.5.36')
    validate_preparation_ref('hotfix/0.5.36', 'hotfix', '0.5.36')
    validate_preparation_ref('deploy/release/0.5.36', 'deploy/release', '0.5.36')
