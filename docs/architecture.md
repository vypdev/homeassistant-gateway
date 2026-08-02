# Architecture

Primary: Home Assistant App. The Gateway follows a pragmatic Clean Architecture boundary. A future companion custom integration may provide optional in-HA helpers, but it is not required by the Gateway runtime.

```text
presentation → application ports/use cases → infrastructure adapters
                                      ↘ sanitized persistence
```

## Boundaries

- `presentation`: FastAPI, MCP transport, Ingress identity, request/response mapping and static UI.
- `application`: read-only use cases, authorization decisions, development probes, job/report contracts and domain models.
- `infrastructure`: Supervisor/Home Assistant HTTP adapter, SQLite stores, local port diagnostics and local job execution.
- `composition.py`: dependency wiring and runtime profile selection.

The Supervisor adapter may implement several small Home Assistant capabilities, but application use cases must depend on ports rather than HTTPX, SQLite or FastAPI.

## Runtime guarantees

Development jobs are process-local, bounded and non-durable. They expose terminal errors, expire after a bounded age, are retained for a limited period and shut down with the application. A restart intentionally removes active jobs; durable queues are out of scope until multi-worker execution or restart recovery becomes a requirement.

## Security boundary

MCP transport authentication and Supervisor Ingress authentication are separate. Read-only capabilities are resolved per declared client. Diagnostics are sanitized and never include credentials, arbitrary upstream response bodies, shell output or unrestricted network probing.

## Evolution rule

Prefer additive ports, adapters and contract tests over broad rewrites. Public MCP names, observer semantics and existing configuration keys must remain compatible unless a migration is documented.
