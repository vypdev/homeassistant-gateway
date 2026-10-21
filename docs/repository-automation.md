# Repository automation

Contributors use the installed [Copilot guide](../.copilot/AGENT_GUIDE.md).
Production is `master`; development is `develop`. `main` is a retained legacy
ref, not a publication source.

## Contribution and verification

1. Use one enabled Issue Form and complete its required fields.
2. A maintainer adds `in-progress`. Wait for the Action's linked branch and
   verified `branched` result. Feature/contract-change issues first pass the SDD
   gate using [the capability catalog](../specs/catalog.json).
3. Check out that exact branch, make focused changes and run the repository
   checks. Branch creation, naming, synchronization and cleanup belong to Copilot.
4. Open a linked PR, inspect CI/Bugbot evidence and obtain human review. The
   current approval policy is `recommend`; it does not approve or merge the PR.

`CI` produces the exact required jobs `test`, `frontend` and `app-packaging` for
PRs/pushes to `master` and `develop`, and for merge groups. Ordinary CI and
RepoWise use disposable `ubuntu-latest` runners. Agent jobs keep the reviewed
`vypdev` group with `self-hosted`, `codex`, `Linux`; they never silently fall
back to another route. Runner capacity and runtime authentication are separate.

The local [verification setup action](../.github/actions/setup-verification/action.yml)
prepares Python 3.11, Node 22, an isolated Python test environment and frozen
frontend dependencies in release/hotfix preparation and accepted-image publication. Corepack selects
`pnpm@11.15.1` from `frontend/package.json`. A matching installed pnpm binary is
exposed through a private tool launcher so credential-free verification can replace HOME without trying
to download another package manager. Dependency steps receive no Action or
model credentials. Only `python`, `python3` and `pnpm` launchers enter PATH;
dependency-provided `git` or `gh` executables cannot shadow trusted commit tools.
Release preparation keeps checkout credentials disabled, stages only fixed
metadata paths, disables contributor hooks and scopes push authentication to the
final bounded Git command after verification. The reviewed runtime declaration for Copilot verification is
[verification-prerequisites.json](../.copilot/verification-prerequisites.json).

Run locally:

```bash
.venv/bin/python -m pytest
.venv/bin/python -m scripts.check_specifications
python scripts/check_package_manager.py
pnpm --dir frontend run check
pnpm --dir frontend exec design.md lint ../DESIGN.md
git diff --check
```

The existing configured autofix commands retain backend coverage at 85% and
frontend runtime/architecture/UX, type and build gates. Focused tests additionally
protect workflow ordering, the SDD catalog and release preparation. Installation
of a separate CI environment does not prepare a comment or autofix job.

Generated Copilot workflows remain unchanged, except for the two documented
release/hotfix extension points. Their operator-managed self-hosted environment
must already expose the declared Python/Node/pnpm versions and project test
dependencies to credential-free verification. A Corepack shim that needs the
original HOME is insufficient. The declaration fails closed; it installs nothing.
[Copilot's verification contract](https://github.com/vypdev/copilot/blob/master/docs/security-operations/operations/verification.mdx)
and [upstream #620](https://github.com/vypdev/copilot/issues/620) document this
operator prerequisite. Provision and verify the runner environment before
retrying branch-sync or autofix; do not weaken checks or change generated YAML.
Set the non-secret Repository Variable `COPILOT_BOT_LOGIN` to the PAT bot's actual
login (`vypbot` in the observed installation) to reject its own events before
allocating a runner.

## Stable publication

Use the enabled Release/Hotfix issue flow. After `in-progress` and verified
branch readiness, an explicitly authorized maintainer launches with `deploy`.
Preparation updates the stable/Edge app versions, package version, changelog and
pinned consumer examples, then runs verification before committing.

The [official automatic deployment contract](https://github.com/vypdev/copilot/blob/master/docs/guides/releases-and-hotfixes.mdx)
uses `reconciliation-pr-mode: auto`: after one authorized `deploy` launch,
Copilot creates the production promotion PR and lets GitHub enforce target rules.
It merges a ready PR at its verified SHA, or enables native auto-merge while
required checks/reviews are pending when the repository allows it. There is no
runner polling or separate manual publisher. Required human reviews, if
configured on a target, still apply. Release branches are `release/<version>`
from the frozen `develop` origin; hotfix branches are `hotfix/<version>` from the
selected production tag. Metadata preparation accepts only that version ref.

After protected production promotion, Copilot verifies the durable
operation and creates its accepted production tag. The reusable `Release App`
workflow checks out that exact tag, verifies metadata, runs tests, publishes the
multi-architecture GHCR image, verifies its source revision on all three supported
platforms, scans it and runs the artifact smoke test. Existing version tags are
reused only when every supported platform matches the accepted revision; registry
errors or mismatches stop publication rather than authorizing an overwrite. Only
then may the caller create/verify the GitHub Release and record publication.
`Release App` has no push or manual trigger and creates no GitHub tag or Release.
The normal contribution PR does not call this publisher.

Failed preparation never commits. Failed image verification prevents completion;
the accepted tag and durable issue state are retained. Retry the same operation
through its existing control center. Metadata replay with matching notes is a
no-op; an older version, conflicting notes, unsafe paths or inconsistent package
metadata fail before files are changed. Do not replace an accepted tag or create
a second release issue to recover.

## Initial rollout and development reconciliation

The installation initially reached only `master`, while `develop` was behind.
Merge the reviewed maintenance PR into `master` first so the installed continuation
and completed release/hotfix extension points are available on the default branch. Then use the Action's protected
reconciliation/maintainer PR from `master` into `develop` before starting new
feature work; retain all production changes and the installation. Do not reset
or force-push `develop`. Complete these deployment prerequisites before the first launch:

- Enable repository auto-merge and keep merge commits enabled. At inspection,
  merge commits were enabled and auto-merge was disabled; without auto-merge,
  pending promotion PRs can require a maintainer to merge them.
- Require the intended `test`, `frontend`, and `app-packaging` checks from GitHub
  Actions on `develop` as well as `master`, through normal maintainer policy
  review. At inspection, only `master` had an active required-check ruleset.
- Verify the PAT bot is distinct from the launcher's identity and has Contents,
  Issues, Pull requests and Actions write access. Secret metadata alone is not
  proof of those runtime grants.
- Verify the independent self-hosted runtime prerequisites above. The ordinary
  CI, release preparation and image publisher prepare their own dependencies.

The expected configuration in `.copilot/setup.yml` explicitly retains the
inherited automatic mode and production-lineage reconciliation. No required
check is bypassed and this PR does not launch or merge a deployment.

For hotfixes originating at a tag older than this installation, backport the
reviewed tooling commit onto the exact Action-managed hotfix branch before its
explicit deployment launch. Verify its catalog evidence against that historical
source. The dispatch ref must contain the enabled workflow and preparation tools;
installation on the default branch does not rewrite historical tags.

Issue #19 needed one explicitly authorized bootstrap exception: the Action's
clean synchronization aborted because `/usr/bin/python3` lacked pytest.
[The retained recovery plan](https://github.com/vypdev/homeassistant-gateway/issues/19#issuecomment-6311894363)
records the exact refs/revisions and normal local synchronization into the same
managed branch. This exception does not change future Action ownership.

For diagnosis, use `copilot doctor --read-only --config .copilot/setup.yml`.
The tracked non-secret config describes the reviewed expected installation.
Runtime PAT identity/write grants, native guarded approval and a real release
remain separate verification activities. This maintenance PR neither enables
guarded approval nor launches a deployment.

The current `copilot doctor` compares managed workflow bytes with its generic
templates and reports the two adapted release/hotfix workflows as changed. Those
are documented consumer extension points; validate their preparation and gateway
publication contracts with the workflow tests and CI.
Do not regenerate them blindly or edit guidance hashes to hide customization.
The SDD and guidance/profile checks pass independently. Native guarded-approval
readiness remains blocked while recommendation mode is intentionally retained.

Both publication callbacks pass the live merge-queue attestation policy into
reconciliation. The missing upstream template input is tracked in
[vypdev/copilot#643](https://github.com/vypdev/copilot/issues/643).
