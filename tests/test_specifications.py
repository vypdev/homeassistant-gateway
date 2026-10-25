import copy
import json
from pathlib import Path
import shutil

import pytest

from scripts.check_specifications import validate_specifications


ROOT = Path(__file__).parents[1]


@pytest.fixture
def catalog_root(tmp_path: Path) -> Path:
    shutil.copytree(ROOT / 'specs', tmp_path / 'specs')
    catalog = json.loads((tmp_path / 'specs/catalog.json').read_text())
    for capability in catalog['capabilities']:
        for field in ['workflows', 'entrypoints', 'code', 'tests', 'documentation']:
            for name in capability[field]:
                path = tmp_path / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('fixture evidence\n')
    return tmp_path


def change_catalog(root: Path, change) -> None:
    path = root / 'specs/catalog.json'
    catalog = json.loads(path.read_text())
    change(catalog)
    path.write_text(json.dumps(catalog))


def test_complete_catalog_and_canonical_documents_validate(catalog_root: Path) -> None:
    assert validate_specifications(catalog_root) == []


def test_missing_evidence_is_rejected(catalog_root: Path) -> None:
    (catalog_root / 'scripts/prepare_release.py').unlink()
    assert validate_specifications(catalog_root)


@pytest.mark.parametrize('name', ['../outside.py', '/tmp/outside.py', '.git/config', 'file:stream'])
def test_unsafe_evidence_paths_are_rejected(catalog_root: Path, name: str) -> None:
    change_catalog(catalog_root, lambda c: c['capabilities'][0]['code'].append(name))
    assert validate_specifications(catalog_root)


def test_duplicate_capability_ownership_is_rejected(catalog_root: Path) -> None:
    change_catalog(catalog_root, lambda c: c['capabilities'].append(copy.deepcopy(c['capabilities'][0])))
    assert validate_specifications(catalog_root)


def test_symlinked_evidence_is_rejected(catalog_root: Path) -> None:
    path = catalog_root / 'scripts/prepare_release.py'
    path.unlink()
    path.symlink_to(catalog_root / 'README.md')
    assert validate_specifications(catalog_root)


def test_fenced_headings_cannot_satisfy_the_standard(catalog_root: Path) -> None:
    path = catalog_root / 'specs/README.md'
    path.write_text('```markdown\n' + path.read_text() + '\n```\n')
    assert validate_specifications(catalog_root)


def test_inconsistent_numeric_test_budget_is_rejected(catalog_root: Path) -> None:
    path = catalog_root / 'specs/repository-automation.md'
    path.write_text(path.read_text().replace('**49**', '**50**'))
    assert validate_specifications(catalog_root)


@pytest.mark.parametrize('field,value', [('status', []), ('lastVerified', '20261021')])
def test_malformed_metadata_is_a_validation_error(catalog_root: Path, field, value) -> None:
    change_catalog(catalog_root, lambda c: c['capabilities'][0].update({field: value}))
    assert validate_specifications(catalog_root)
