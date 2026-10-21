"""Regression contracts for the gateway's installed repository automation."""

import json
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).parents[1]


def workflow(name: str) -> dict:
    return yaml.load(
        (ROOT / '.github' / 'workflows' / name).read_text(), Loader=yaml.BaseLoader
    )


@pytest.mark.parametrize('event', ['pull_request', 'push'])
def test_required_ci_covers_production_and_development(event: str) -> None:
    assert {'master', 'develop'} <= set(workflow('ci.yml')['on'][event]['branches'])


def test_ci_produces_required_checks_for_merge_groups() -> None:
    ci = workflow('ci.yml')
    assert ci['on']['merge_group']['types'] == ['checks_requested']
    assert {'test', 'frontend', 'app-packaging'} <= set(ci['jobs'])


def test_edge_builds_the_triggering_supported_branch() -> None:
    edge = workflow('edge-app.yml')
    assert {'master', 'develop'} <= set(edge['on']['push']['branches'])
    checkout = edge['jobs']['build-and-publish']['steps'][0]
    assert checkout['with'].get('ref') in (None, '${{ github.sha }}')


def test_stable_publisher_can_only_be_called_by_orchestration() -> None:
    assert set(workflow('release-app.yml')['on']) == {'workflow_call'}


@pytest.mark.parametrize('filename', ['release_workflow.yml', 'hotfix_workflow.yml'])
def test_release_completion_depends_on_successful_image_publication(filename: str) -> None:
    jobs = workflow(filename)['jobs']
    publisher = jobs['publish-image']
    assert publisher['uses'] == './.github/workflows/release-app.yml'
    assert publisher['needs'] == 'publish'
    assert 'publish-image' in jobs['complete-publication']['needs']
    actions = [s['with']['single-action'] for s in jobs['complete-publication']['steps'] if 'single-action' in s.get('with', {})]
    assert actions == ['create_release', 'published_deployment_action']


def test_sdd_gate_has_its_required_repository_files() -> None:
    for filename in ['catalog.json', 'README.md', '_template.md']:
        assert (ROOT / 'specs' / filename).is_file(), filename


@pytest.mark.parametrize('filename', ['release_workflow.yml', 'hotfix_workflow.yml'])
def test_deployment_prepares_tools_before_metadata_changes(filename: str) -> None:
    steps = workflow(filename)['jobs']['prepare-version-files']['steps']
    bootstrap = next(i for i, s in enumerate(steps) if s.get('uses') == './.github/actions/setup-verification')
    prepare = next(i for i, s in enumerate(steps) if s.get('run') == 'python -m scripts.prepare_release')
    assert bootstrap < prepare
    assert 'env' not in steps[bootstrap]


def test_required_checks_use_ephemeral_runners() -> None:
    assert all(job['runs-on'] == 'ubuntu-latest' for job in workflow('ci.yml')['jobs'].values())
    assert workflow('repowise.yml')['jobs']['code-health']['runs-on'] == 'ubuntu-latest'


def test_release_preparation_keeps_inputs_out_of_shell_source() -> None:
    for name in ['release_workflow.yml', 'hotfix_workflow.yml']:
        steps = workflow(name)['jobs']['prepare-version-files']['steps']
        prepare = next(s for s in steps if s.get('name') == 'Prepare gateway release metadata')
        assert prepare['env']['RELEASE_CHANGELOG'] == '${{ inputs.changelog }}'
        assert '${{' not in prepare['run']
        assert 'publish-image' in workflow(name)['jobs']['report-failure']['needs']


def test_publisher_uses_accepted_tag_and_never_creates_a_github_release() -> None:
    steps = workflow('release-app.yml')['jobs']['release']['steps']
    checkout = next(s for s in steps if s.get('uses', '').startswith('actions/checkout@'))
    assert checkout['with']['ref'] == 'refs/tags/v${{ inputs.version }}'
    assert not any('gh release' in s.get('run', '') for s in steps)
    build = next(s for s in steps if s.get('uses', '').startswith('docker/build-push-action@'))
    assert '${{ steps.source.outputs.sha }}' in build['with']['build-args']


def test_project_pnpm_matches_the_declared_isolated_runtime() -> None:
    package = json.loads((ROOT / 'frontend/package.json').read_text())
    expected = package['packageManager'].removeprefix('pnpm@')
    assert package['devDependencies']['pnpm'] == expected
    declared = json.loads((ROOT / '.copilot/verification-prerequisites.json').read_text())
    assert declared['runtimes']['pnpm'] == expected


def test_installed_bot_admission_supports_the_repository_variable() -> None:
    for filename in ['copilot_issue_comment.yml', 'copilot_pull_request_comment.yml', 'copilot_commit.yml']:
        condition = next(iter(workflow(filename)['jobs'].values()))['if']
        assert 'vars.COPILOT_BOT_LOGIN' in condition


def test_dependency_setup_receives_no_publication_or_model_credentials() -> None:
    action = yaml.load((ROOT / '.github/actions/setup-verification/action.yml').read_text(), Loader=yaml.BaseLoader)
    steps = action['runs']['steps']
    assert all('env' not in step for step in steps)
    assert not any('secrets.' in str(step) for step in steps)


@pytest.mark.parametrize('filename', ['release_workflow.yml', 'hotfix_workflow.yml'])
def test_publication_passes_live_queue_policy_to_reconciliation(filename: str) -> None:
    steps = workflow(filename)['jobs']['complete-publication']['steps']
    continuation = next(s for s in steps if s.get('with', {}).get('single-action') == 'published_deployment_action')
    assert continuation['with']['merge-queue-check-attestations'] == "${{ vars.MERGE_QUEUE_CHECK_ATTESTATIONS || '[]' }}"


def test_deployment_queue_preserves_pending_runs_without_cancellation() -> None:
    for name in ['release_workflow.yml', 'hotfix_workflow.yml', 'release-app.yml']:
        concurrency = workflow(name)['concurrency']
        assert concurrency['queue'] == 'max'
        assert concurrency['cancel-in-progress'] == 'false'


def test_release_verification_has_no_persisted_git_write_credential() -> None:
    for name in ['release_workflow.yml', 'hotfix_workflow.yml']:
        steps = workflow(name)['jobs']['prepare-version-files']['steps']
        assert steps[0]['with']['persist-credentials'] == 'false'
        commit = next(s for s in steps if s.get('uses') == 'EndBug/add-and-commit@v9')
        assert commit['with']['push'] == 'false'
        assert commit['with']['fetch'] == 'false'
        assert commit['with']['add'] != './'
        assert commit['env']['GIT_CONFIG_KEY_0'] == 'core.hooksPath'
        push = steps[-1]
        assert push['env']['GH_TOKEN'] == '${{ secrets.GITHUB_TOKEN }}'
        assert 'timeout=60' in push['run']


def test_image_replays_skip_build_but_still_verify_the_published_artifact() -> None:
    steps = workflow('release-app.yml')['jobs']['release']['steps']
    build = next(s for s in steps if s.get('uses', '').startswith('docker/build-push-action@'))
    assert build['if'] == "steps.existing.outputs.exists == 'false'"
    assert any(s.get('run') == 'python -m scripts.release_image --require-existing' for s in steps)
