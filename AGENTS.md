# Engineering Guide

## Non-negotiable quality bar

This repository prioritizes correctness, maintainability, security, and verifiable behavior over implementation speed.

A change is incomplete until:

- the behavior is covered by focused tests, including relevant denial/error paths;
- domain/application code remains independent of Home Assistant, MCP, HTTP, filesystem, subprocess, and framework details;
- external calls have bounded timeouts and sanitized errors;
- secrets are absent from source, fixtures, logs, exceptions, audit events, and test output;
- documentation and contracts match the implementation;
- local quality checks and CI pass;
- the final diff is reviewed and free of generated artifacts.

## Architecture rules

Layers point inward:

```text
presentation -> application -> domain
infrastructure -> application/domain ports
composition -> wires concrete adapters
```

- Domain code contains policies, capabilities, identifiers, and decisions.
- Application code orchestrates use cases through injected ports.
- Infrastructure adapts Home Assistant, Supervisor, MCP, storage, and transports.
- Presentation maps external requests/responses and must not contain authorization policy.
- Composition is the only place that constructs concrete adapters.

Do not import Home Assistant, MCP SDKs, HTTP clients, or environment/config readers into domain modules.

## Development workflow

1. Record the current contract and assumptions.
2. Write a focused failing test.
3. Run the test and confirm the failure is meaningful.
4. Implement the smallest production change.
5. Run the focused test, then the complete suite.
6. Add integration/contract coverage at the boundary.
7. Update documentation and review the full diff.
8. Run all quality gates before publishing.

## Security rules

- Observer is read-only.
- Operator is never enabled implicitly by a prompt, model, or tool name.
- Every mutation requires identity, capability, target policy, validation, approval, idempotency, and audit.
- Do not read or expose raw Home Assistant configuration directories by default.
- Do not add Docker socket, SSH, shell, or arbitrary filesystem capabilities.
- Never commit real credentials, tokens, cookies, topology secrets, or private identifiers.

## Compatibility and deployment

The Supervisor App is the primary runtime boundary. The optional custom integration must not duplicate policy or credential logic. Public MCP tool names and capability identifiers are contracts; change them deliberately and document migrations.

## Verification commands

```bash
.venv/bin/python -m pytest
.venv/bin/python -m compileall -q .
git diff --check
npx -y @google/design.md lint DESIGN.md
```
