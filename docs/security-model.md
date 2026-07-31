# Security model

## Threat model

The gateway protects Home Assistant from compromised or over-privileged MCP clients, prompt-induced mutations, leaked credentials, accidental broad discovery, and unsafe automation changes.

Assume an MCP client can produce malicious or mistaken tool arguments. The gateway must enforce policy independently of model instructions.

## Profiles

### Observer (default)

Read-only access to:

- entities and states;
- devices, areas, floors, labels, and integrations;
- automations, scripts, scenes, helpers, and service metadata;
- safe configuration metadata and diagnostics;
- audit records allowed for the caller.

Observer cannot call Home Assistant services, edit automations, write files, invoke shell commands, or manage credentials.

### Operator (explicit)

Operator is a separate client identity and policy. It may eventually receive narrowly scoped capabilities such as:

- enable/disable an automation;
- update a specific automation after a validated diff;
- call an allowlisted service on an allowlisted target;
- rotate a gateway credential.

Operator access is disabled until provisioned in the Home Assistant UI.

## Mutation requirements

Every mutation must pass:

1. authenticated client identity;
2. capability check;
3. target allowlist check;
4. schema and invariant validation;
5. dry-run/diff where applicable;
6. explicit confirmation or approval token;
7. idempotency key;
8. bounded execution timeout;
9. audit event before and after execution;
10. safe error mapping.

No mutation may be inferred from natural-language intent alone.

## Credential handling

- Never accept upstream Home Assistant passwords, long-lived tokens, or private keys in MCP arguments.
- Never include credentials in prompts, tool results, logs, audit events, snapshots, tests, or Git history.
- Store secrets only through the Home Assistant storage boundary chosen by the implementation.
- UI shows `configured`, `last rotated`, and `last validation`, not secret contents.
- Rotation is explicit and invalidates old material.

## Network boundary

- Native mode binds to loopback or Home Assistant-local transport by default.
- Remote access requires authenticated client identities and an explicit protected reverse-proxy/deployment boundary.
- No `0.0.0.0` default.
- No Docker socket, SSH, arbitrary shell, or unrestricted filesystem tools.

## Audit

Audit events include:

- event ID and correlation ID;
- timestamp;
- client identity and profile;
- capability and tool name;
- target reference, redacted where needed;
- decision (`allowed`, `denied`, `approval_required`);
- result category and safe error code.

Audit events must be append-only from the application perspective and bounded in size. They must not store raw Home Assistant payloads by default.

## Security acceptance gates

Before enabling any operator capability:

- policy tests cover allow, deny, approval, replay, and malformed requests;
- integration tests exercise the real Home Assistant service boundary in a disposable test setup;
- redaction tests prove secrets cannot appear in representations or errors;
- repeated calls and concurrent requests are covered;
- the UI makes profile and capability boundaries visible;
- a rollback path exists for automation changes;
- documentation describes exactly what is enabled.
