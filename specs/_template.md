# <Gateway capability specification>

- Status: Draft
- Date: YYYY-MM-DD
- Catalog capability ID: <stable catalog ID>
- Last verified: YYYY-MM-DD
- Owners: Gateway maintainers
- Scope: <bounded capability>
- Related issues/PRs: <links>
- Required review gates: architecture, testing, documentation, security/operations
- Open decisions blocking readiness: <none or list>

Read [the specification standard](README.md) before completing this template.

## 1. Executive summary

State the user-visible outcome and the principal safety rule.

## 2. Problem, current behavior, and evidence

Separate verified current behavior, observed evidence, unknowns and proposed changes. For a baseline, include Observed behavior:, Intentional contract:, Known debt and limitations:, Unknown rationale:, and Proposed improvements:.

## 3. Actors, surfaces, and terminology

Name the users, operators, contributors and relevant surfaces.

## 4. Goals, non-goals, and fixed invariants

List goals, non-goals and invariants that configuration cannot weaken.

## 5. Current versus proposed product journey

Explain the before/after journey. Include a compact diagram and its textual equivalent.

## 6. Functional behavior and state model

Describe the happy path, alternatives, transitions, duplicates, stale events and partial success.

## 7. User-facing configuration

Specify names, defaults, allowed values, bounds, scope, precedence and invalid combinations.

## 8. Clean Architecture design

Assign policy, orchestration, adapter and presentation responsibilities and executable dependency constraints.

## 9. UI/UX and content contract

Describe Pending:, Action required:, Blocked:, Partial: and Complete: states, accessibility, localization and sanitization.

## 10. Failure, recovery, and cleanup

Document failure impact, retained state, bounded retry, owner action and cleanup.

## 11. Security, permissions, and privacy

Define authorization, least privilege, untrusted inputs, secrets and abuse defenses.

## 12. Observability and operational UX

Identify user-visible status, safe diagnostics, correlation and actionable operator evidence.

## 13. Compatibility, migration, rollout, and rollback

Describe compatibility, in-flight work, staged rollout, backmerge and rollback.

## 14. Testing strategy and numeric budget

Use a numeric table with positive integer allocations and one Total equal to their sum. Retain existing coverage and test gates.

## 15. Documentation and discoverability

Name the user, operator and contributor pages and how examples are checked.

## 16. Acceptance scenarios

Write observable Given/When/Then scenarios for success, denials, failure, replay and recovery.

## 17. Requirements traceability

Map each MUST to its policy/use case/adapter, test evidence and documentation.

## 18. Implementation sequence

Order tests, implementation, boundary coverage, documentation, migration and final review.

## 19. Definition of Done

Require acceptance, architecture, coverage, docs, security, failure recovery, clean diff and human review. Run python -m scripts.check_specifications.

## 20. References and decisions

Link primary sources, related work, decisions, rejected alternatives and explicit follow-up scope.
