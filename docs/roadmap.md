# Roadmap

## Milestone 0 — contract and skeleton

- [x] Create repository and public project contract.
- [x] Define Home Assistant-native deployment shape.
- [x] Define observer/operator profiles.
- [x] Define credential, audit, and MCP boundaries.
- [ ] Add CI, packaging, and a minimal custom integration skeleton.

## Milestone 1 — observer integration

- [ ] Config flow and options flow.
- [ ] Secure credential adapter with rotation status.
- [ ] Native panel for status, capabilities, and safe diagnostics.
- [ ] Complete read-only inventory tools.
- [ ] Automation/script/scene/configuration readers.
- [ ] Stable redaction, pagination, timeout, and size-limit contracts.
- [ ] Snapshot-based analysis context.

## Milestone 2 — MCP transport and clients

- [ ] Local authenticated MCP transport.
- [ ] Client identity provisioning in the UI.
- [ ] Observer policy enforcement independent of model prompts.
- [ ] OpenClaw integration example.
- [ ] Hermes integration example.
- [ ] Repeated-call and concurrent-session tests.

## Milestone 3 — operator foundations

- [ ] Operator profile provisioning disabled by default.
- [ ] Explicit capability allowlists.
- [ ] Dry-run and structured diffs.
- [ ] Approval tokens and idempotency.
- [ ] Append-only audit events.
- [ ] Rollback support for automation updates.

## Milestone 4 — first safe mutations

Only after Milestone 3 gates pass:

- [ ] Enable/disable one allowlisted automation.
- [ ] Update an automation through validated diff and rollback.
- [ ] Call a narrowly allowlisted service on explicitly allowlisted targets.
- [ ] Add operator UI warnings and emergency disable.

## Non-goals

- Arbitrary shell or Python execution.
- Docker socket access.
- Transparent proxying of Home Assistant's entire API.
- Storing client or Home Assistant secrets in OpenClaw/Hermes.
- Enabling operator permissions by default.
