# Troubleshooting

## `401 invalid_client_token`

The endpoint is reachable, but the token is missing, invalid or revoked. Generate or rotate the token from the administration UI and update only the corresponding client.

Do not reuse another client's token or include it in a support ticket.

## `401 ingress_identity_required`

You are accessing an administration route without Supervisor Ingress context. Use the UI from the Home Assistant panel. The direct MCP port does not replace Ingress for the console.

## `421 Invalid Host header`

The `Host` used by the client is not in `mcp_allowed_hosts`. Add the destination hostname or IP without a port, save the configuration and restart the App.

The allowlist validates the destination, not the client's source IP. Do not add `ai01.lan` if the URL uses `192.168.20.101`.

## `429 development_jobs_busy`

The console has reached its active-job limit. Wait for jobs to finish or inspect their `job_id` values before running another operation. The gateway does not create unlimited threads.

## `404 development_job_not_found`

The job expired, was cleaned up or disappeared after a process restart. Jobs are local and non-durable. Start a new execution.

## `503` or unavailable upstream

Home Assistant/Supervisor did not respond, the timeout expired or the upstream returned an unusable state. Check upstream health from the console and retry when it is available.

## `warning` or `empty_result`

The request completed but returned an empty collection or an inconclusive result. This is not automatically a transport failure. Check the inventory, query scope and Home Assistant state.

## MCP is reachable but expected tools are missing

Check the `client_id`, assigned profile and effective capabilities with `tools/list`. Connectivity does not prove that the client has permission.

## After restarting the App

- the UI and MCP become available when Supervisor marks the App active;
- in-memory jobs disappear;
- persisted clients and tokens must not be regenerated unless they were revoked;
- repeat `initialize` and `tools/list` from the authorized client.

## Rollback

If an update breaks connectivity, preserve the configuration data and temporarily return to the last stable image from Supervisor. Then verify `/mcp/` without a token (`401`), the Ingress UI and an authenticated `initialize` before retrying the update.
