# Gateway specification standard

The capability owners and their verified repository evidence are registered in
[catalog.json](catalog.json). Start new specifications from [_template.md](_template.md).
Run `python -m scripts.check_specifications` after changing a specification or an
evidence path. Copilot applies its own bundled prerequisite validator as well.

## 1. Core criteria

Use observed repository behavior, explicit proposed changes and testable requirements.
A MUST requires an acceptance scenario. Identify unknowns and debt instead of
presenting them as intentional behavior. Every diagram needs a textual equivalent.

## 2. Required specification contract

Keep all twenty numbered template sections. Cover actors, current evidence,
invariants, configuration, architecture, product behavior, failures, security,
operations, migration, tests, documentation, acceptance and decisions. Mark a
non-applicable concern explicitly with its reason.

## 3. Product and GitHub UI/UX standard

Describe pending, action-required, blocked, partial and complete states in plain
language. Put current status and the next human action before implementation
detail. Checks, labels and model output cannot replace verified native facts.
Preserve accessibility, localization, narrow layouts and sanitized errors.

## 4. Clean Architecture standard

Dependencies point inward: presentation and infrastructure use application/domain
contracts; composition constructs concrete adapters. Domain/application code must
remain independent of Home Assistant, HTTP, MCP, processes and filesystems. Keep
provider calls bounded and map errors without disclosing credentials.

## 5. Configuration standard

Document defaults, allowed values, bounds, scope, precedence, persistence and
invalid combinations. Observer is read-only. Operator requires explicit identity,
capability, target policy, validation, approval, idempotency and audit. Configuration
cannot grant arbitrary shell, Docker socket, SSH or raw Home Assistant files.

## 6. Test budget standard

Derive a positive numeric case budget from behavior and risk in section 14. Each
allocation is a positive integer and the total equals their sum. Include denial,
failure, replay, stale-state and boundary cases. Keep the repository's 85% backend
coverage gate and frontend/browser checks; counts do not replace coverage.

## 7. Documentation standard

Identify user, operator and contributor documentation. Keep version examples,
workflow names, capability identifiers and migration instructions synchronized
with implementation. Link evidence using regular contained repository files.
Never put credentials or private installation identifiers into specifications.

## 8. Acceptance, traceability, and review

Map each normative requirement to an observable acceptance scenario, concrete
tests and documentation. Record unresolved decisions, rollout and rollback.
As-built baselines distinguish observed behavior, intentional contract, known
debt, unknown rationale and proposed improvements. Readiness requires the relevant
quality gates and human review of material product or security decisions.
