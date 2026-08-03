# Release checklist — v0.5.0

## Scope

- [ ] Confirm that no secrets, tokens, cookies or `SUPERVISOR_TOKEN` values remain in code, tests, logs, fixtures or documentation.
- [ ] Confirm that the `observer` profile remains read-only and that the effective tool set contains 18 tools.
- [ ] Confirm separation between Ingress and direct MCP, with `mcp_allowed_hosts` configured without a global `*`.

## Local gates

From the repository root:

```bash
.venv/bin/python -m pytest -q
.venv/bin/ruff check src tests scripts
.venv/bin/python -m compileall -q src tests scripts
.venv/bin/python -m pip_audit --skip-editable
.venv/bin/python scripts/check_frontend_i18n.py
.venv/bin/python scripts/check_frontend_i18n_runtime.py
npm --prefix frontend run test:runtime
npm --prefix frontend run check
npm --prefix frontend run build
git diff --check
git status --short
```

The working tree must be clean and every command must exit with code `0`.

## Metadata

- [ ] `addon/config.yaml` contains version `0.5.0`.
- [ ] `pyproject.toml` contains version `0.5.0`.
- [ ] `addon/CHANGELOG.md` describes changes, boundaries and migration.
- [ ] README and consumer documentation reference `0.5.0`.
- [ ] The release commit contains only reviewed changes.

## GitHub and artifacts

- [ ] Push to `main` completed.
- [ ] CI green.
- [ ] Release App green.
- [ ] Trivy green.
- [ ] Create tag and release `v0.5.0` only after those gates.
- [ ] Verify the release:

```bash
gh release view v0.5.0 --repo vypdev/homeassistant-gateway
docker manifest inspect ghcr.io/vypdev/homeassistant-gateway:0.5.0
gh run list --repo vypdev/homeassistant-gateway --limit 10
```

- [ ] Confirm `linux/amd64`, `linux/arm64` and `linux/arm/v7`.

## Authorized smoke test

Without displaying or storing credentials:

- [ ] `/` without Ingress context → expected `401` rejection.
- [ ] `/mcp/` without a Bearer token → expected authentication rejection.
- [ ] `/mcp/` with an authorized client → successful `initialize`.
- [ ] `tools/list` → 18 observer read-only tools.
- [ ] No tokens, cookies or secrets appear in responses or logs.

## Rollback

If the smoke test fails, do not promote the release. Keep the stable image available, restore the version from Supervisor and repeat `/mcp/` without a token, the Ingress UI and authenticated `initialize` before investigating.
