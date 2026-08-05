# Frontend contracts and concurrency follow-up

## Goal

Strengthen the frontend clean-architecture boundary and test evidence without adding artificial abstractions or weakening existing contracts.

## Slices

1. **Autosave response contract**
   - Add a typed response contract for `PUT /api/operator/service-policy`.
   - Validate `selected` as an array of strings.
   - Add malformed-response runtime tests and adapter request/response evidence.

2. **HTTP error normalization**
   - Preserve current HTTP error mapping and `204` behavior.
   - Normalize invalid successful JSON into the existing `invalid_response` gateway error.
   - Preserve abort semantics so cancellation is not shown as a generic UI error.

3. **Mutation/bootstrap concurrency**
   - Add a presentation/application generation boundary for create/revoke/rotate operations.
   - Prevent a stale mutation bootstrap from overwriting a newer operation.
   - Keep HTTP concerns in the adapter and Lit state assignment in the root façade.

4. **Autosave failure/recovery**
   - Verify serialized writes, failure isolation, queue recovery, snapshot immutability, and latest-error ownership.

5. **Runtime test organization**
   - Keep one `test:runtime` aggregator while its controller, adapter, contract, HTTP-wrapper, and pure-helper sections remain explicit.
   - Do not split the small runner into cosmetic files; a future split should first extract a shared transpilation harness and only proceed if focused execution or ownership requires it.
   - Continue importing the real TypeScript sources through the existing temporary transpilation path.

6. **ASGI/frontend contract review**
   - Inspect existing backend contract tests and only add a shared boundary check where the repository has a stable, non-duplicated contract.
   - Do not create a second schema source of truth.

## Gates

- Focused runtime/adapter/controller tests.
- TypeScript and architecture boundary checks.
- Frontend build and UX/i18n checks.
- Focused and full Playwright matrix.
- Backend pytest, compileall, and diff hygiene.
- Independent review of the exact staged diff.
- Commit/push and remote CI verification.

## Evidence boundaries

Contract tests, browser tests, artifacts, and live Home Assistant verification remain separate claims. No frontend coverage percentage is introduced until stable source maps/instrumentation exist.
