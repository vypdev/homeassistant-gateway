# Architecture

Primary: Home Assistant App. The Gateway follows a pragmatic Clean Architecture boundary. A future companion custom integration may provide optional in-HA helpers, but it is not required by the Gateway runtime.

```text
presentation → application ports/use cases → infrastructure adapters
                                      ↘ sanitized persistence
```

- `frontend/src/api.ts`: browser HTTP boundary for Ingress-relative API requests.
- `frontend/src/models.ts`: shared UI/domain response types.
- `frontend/src/development-service.ts`: bounded development-job queueing and polling.
- `frontend/src/development-controller.ts`: typed orchestration boundary for queue → poll → report refresh.
- `frontend/src/diagnostics-service.ts`: sanitized diagnostic export and clipboard operations.
- `frontend/src/main.ts`: Lit shell, navigation, state coordination and remaining views.

The frontend follows the same direction: transport and long-running operations are outside the root component; view extraction must preserve the existing translation, accessibility and reduced-motion contracts.

## Boundaries

- `presentation`: FastAPI, MCP transport, Ingress identity, request/response mapping and static UI.
- `application`: read-only use cases, authorization decisions, development probes, job/report contracts and domain models.
- `infrastructure`: Supervisor/Home Assistant HTTP adapter, SQLite stores, local port diagnostics and local job execution.
- `composition.py`: dependency wiring and runtime profile selection.

The Supervisor adapter currently uses a concrete multiple-inheritance façade over small reader mixins. This is retained intentionally: the mixins share the bounded transport, trace context, fallback policy and sanitization primitives, and the façade is the single composition boundary exposed to application ports. Application use cases still depend on ports rather than HTTPX, SQLite or FastAPI. Replacing it with delegation would be a larger mechanical refactor without a demonstrated contract or testability gain; any future migration must first introduce independent reader constructors and contract tests.


## Runtime guarantees

Development jobs are process-local, bounded and non-durable. They expose terminal errors, expire after a bounded age, are retained for a limited period and shut down with the application. A restart intentionally removes active jobs; durable queues are out of scope until multi-worker execution or restart recovery becomes a requirement.

## Security boundary

MCP transport authentication and Supervisor Ingress authentication are separate. Read-only capabilities are resolved per declared client. Diagnostics are sanitized and never include credentials, arbitrary upstream response bodies, shell output or unrestricted network probing.

## Evolution rule

Prefer additive ports, adapters and contract tests over broad rewrites. Public MCP names, observer semantics and existing configuration keys must remain compatible unless a migration is documented.
