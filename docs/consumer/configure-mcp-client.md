# Configure an MCP client

## Endpoint

Use the real destination included in the URL, for example:

```text
http://<home-assistant-host>:18099/mcp/
```

The destination hostname or IP must appear in `mcp_allowed_hosts`. The allowlist validates the destination `Host`; it does not validate the client's source IP. Enter the host without a port in the configuration. The App accepts the published port used by the client internally.

If the client connects through another DNS name, add that DNS name. Do not add the IP of `ai01.lan` unless it is the destination used in the URL.

## Create the client

From the Supervisor Ingress-protected UI:

1. open **Clients**;
2. choose an independent display name;
3. select the `observer` profile;
4. grant only the required capabilities;
5. save the Bearer token once in the client's secure secret manager.

Do not paste tokens into tickets, screenshots, repositories or conversations. Rotation invalidates the previous token and displays a new one only once.

## Authentication and authorization order

```text
Allowed Host
→ valid Bearer token
→ declared client
→ observer/operator profile
→ authorized capabilities
→ read-only MCP tool
```

A valid token does not automatically grant every tool.

## Observer profile

The `observer` profile exposes read operations only. It does not call services, run scripts, modify automations or change configuration.

Verify the effective tools with `tools/list`. The complete reference is in the [consumer guide](README.md).

## Minimum test

- `GET /mcp/` without a token → expected `401`.
- MCP `initialize` with a valid token → `200`.
- `tools/list` → authorized tools only.
- one read call → sanitized `ok`, `warning` or `error` response.

The Development Console is protected by Supervisor Ingress and is not published through the direct MCP endpoint.

## Rotation and revocation

- **Rotate**: generates a new token and invalidates the previous one.
- **Revoke**: disables the client and its tokens.
- If an agent loses the token, it cannot be retrieved: rotate the client.
- If a token appears in a log or screenshot, revoke it immediately.
