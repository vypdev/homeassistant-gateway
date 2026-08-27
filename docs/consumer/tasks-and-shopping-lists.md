# Home Assistant Tasks and Shopping Lists

This guide documents the verified Home Assistant task and shopping-list capabilities exposed through Home Assistant Gateway's explicitly granted operator-service surface.

## Scope and security boundary

The gateway distinguishes three layers:

1. Home Assistant's native entity and service catalog.
2. The gateway's global operator service ceiling.
3. The individual operator credential's explicit service grants.

A service existing in Home Assistant does not, by itself, make it callable through the gateway. It must also be enabled globally and granted to the operator credential. Observer clients remain read-only.

The examples in this document use the following generic placeholders:

```text
<gateway-url>
<operator-credential>
```

Do not put real bearer tokens in documentation, source code, logs, screenshots or shell history.

## Verified entities

Home Assistant exposes to-do lists as entities in the `todo` domain. The following lists were verified against a live Home Assistant installation:

| Entity | Friendly name | Purpose |
|---|---|---|
| `todo.lista_de_la_compra` | Shopping list | Native shopping list |
| `todo.tareas_ha` | HA Tasks | General task list |
| `todo.tareas` | Tasks | Additional general task list |

The entity state is the number of pending items. The entity attributes expose the friendly name and supported feature bitmask; item details should be retrieved through the supported `todo.get_items` service rather than inferred from the entity state alone.

Names are localized by Home Assistant's UI. Entity IDs and service IDs remain stable, English-language Home Assistant identifiers.

## Shopping list services

The native shopping list integration exposes these services:

| Service | Operation |
|---|---|
| `shopping_list.add_item` | Add an item by name |
| `shopping_list.remove_item` | Remove an item by name |
| `shopping_list.complete_item` | Mark an item as completed |
| `shopping_list.incomplete_item` | Mark an item as pending |
| `shopping_list.complete_all` | Complete all items |
| `shopping_list.incomplete_all` | Reopen all items |
| `shopping_list.clear_completed_items` | Delete completed items |
| `shopping_list.sort` | Sort the list, optionally in reverse order |

These services operate on Home Assistant's native shopping-list store. They are not automation definitions and do not need to be declared in YAML for normal use.

## To-do services

General task lists use the `todo` service domain:

| Service | Operation |
|---|---|
| `todo.add_item` | Add a task, optionally with a due date, due time or description |
| `todo.update_item` | Rename, complete/reopen, or update supported task metadata |
| `todo.remove_item` | Remove a task by item name |
| `todo.get_items` | Read task items, filtered by status when supported |
| `todo.remove_completed_items` | Delete completed tasks |

The exact optional fields depend on the target entity's supported feature flags. The gateway must validate the target entity and service contract before execution.

### `todo.get_items` response contract

`todo.get_items` is the one read-response service in this surface. Its request must contain exactly one `entity_id` target matching `todo.<lowercase_entity_id>`; entity lists, comma-separated targets, other domains and additional target fields are rejected. The optional `status` filter accepts `needs_action`, `completed`, or a list containing those values.

The gateway sends `return_response=true` and accepts only this exact envelope, where the entity key is the requested entity:

```json
{
  "todo.tareas": {
    "items": [
      {
        "summary": "Review the household maintenance plan",
        "status": "needs_action",
        "uid": "example-id"
      }
    ]
  }
}
```

The response contains no extra entity or data keys. Each item must be a mapping whose keys and values use JSON-safe scalar types. The gateway rejects malformed, missing, ambiguous, wrong-entity, wrong-domain and oversized responses rather than truncating them: at most 500 items, 256 KiB serialized response data, and 4096 characters per field name or string value. These failures use the sanitized `home_assistant_invalid_service_response` upstream code and are exposed publicly as `status=unavailable`; authorization denials remain `status=denied`.

The `shopping_list.*` services intentionally retain their no-entity behavior. They use the native shopping-list service payload (for example `{ "name": "Milk" }`) and must still pass the global operator ceiling, the individual credential's service grant, operator capability, approval, idempotency and audit checks.

## Safe examples

### Add a shopping-list item

```json
{
  "domain": "shopping_list",
  "service": "add_item",
  "data": {
    "name": "Milk"
  }
}
```

### Add a task to a selected list

```json
{
  "domain": "todo",
  "service": "add_item",
  "target": {
    "entity_id": "todo.tareas"
  },
  "data": {
    "item": "Review the household maintenance plan"
  }
}
```

### Update a task

```json
{
  "domain": "todo",
  "service": "update_item",
  "target": {
    "entity_id": "todo.tareas"
  },
  "data": {
    "item": "Review the household maintenance plan",
    "status": "completed"
  }
}
```

The examples are illustrative. A client must use its configured gateway approval and idempotency flow; it must not bypass the gateway by calling Home Assistant directly.

## UI location

Home Assistant normally exposes these entities in the **To-do lists** UI. A dashboard can also display a selected list using a native **To-do list** card.

Typical workflow:

1. Open Home Assistant.
2. Open **To-do lists**.
3. Select the localized list name, such as **Shopping list**, **HA Tasks** or **Tasks**.
4. Alternatively, edit a dashboard and add a **To-do list** card targeting the desired entity.

The visible language does not change the entity ID or service ID.

## Verified live behavior

The following behavior was verified through the authorized operator service surface:

- `shopping_list.add_item` successfully added a uniquely named test item to `todo.lista_de_la_compra`.
- `todo.add_item` successfully added a uniquely named test item to `todo.tareas_ha`.
- `todo.add_item` successfully added a uniquely named test item to `todo.tareas`.
- The target entity pending-item count increased after each successful call.
- The gateway returned a successful result and the affected entity state.

Test items are environment data, not fixtures. They must be removed manually or through an explicitly authorized cleanup operation after verification.

## Recommended operating model

Use Home Assistant as the canonical source for household tasks and shopping items:

```text
Home Assistant
├── todo.lista_de_la_compra  -> shopping list
├── todo.tareas_ha           -> general tasks
└── todo.tareas              -> additional task list
```

Agents and scheduled jobs should:

- read the relevant list before creating a duplicate;
- preserve the selected target entity;
- distinguish shopping items from general tasks;
- report the list name and entity ID when ambiguity exists;
- ask for confirmation before destructive removal or bulk completion;
- use idempotency when the same request may be retried;
- report the actual Home Assistant result instead of assuming success.

A Markdown file such as `chores.md` may be a derived report or migration aid, but it should not become a competing source of truth unless an explicit synchronization policy is designed and verified.

## Gateway verification checklist

When a client cannot see or call a service, check each layer independently:

1. Confirm the entity exists in Home Assistant.
2. Confirm the service exists in Home Assistant's service catalog.
3. Confirm the service is enabled in the gateway's global operator policy.
4. Confirm the service is granted to the operator credential.
5. Confirm the authenticated client is using the intended credential.
6. Confirm the target entity is allowed by the target policy.
7. Confirm the operation's approval, validation, idempotency and audit requirements.
8. Verify the resulting entity state or item list after execution.

Do not interpret a missing service in a client UI as proof that Home Assistant lacks the service; it may be filtered by the gateway's effective capability intersection.

## Known limitations

- The entity state is a count, not a complete item listing.
- `todo.get_items` is bounded and fail-closed: malformed envelopes and item values are rejected, not filtered or truncated. The configured response limit is enforced by both the service adapter and the Home Assistant transport before data is decoded or exposed.
- Item-list retrieval must still be verified against the installed Stable artifact after an upgrade; local source/tests are not deployment evidence.
- Service names are English Home Assistant identifiers even when the UI is localized.
- Operator service grants are deployment policy, not inherent authorization for every user or agent.
- Removing items and bulk operations are persistent changes and require explicit intent.

## Source and verification metadata

- Source: live Home Assistant instance through the authorized Home Assistant Gateway operator surface.
- Verification date: 2026-08-23 for the entity/service inventory; response-service adapter fix added for `0.5.35`.
- Scope: entity discovery, service discovery, controlled add-item calls and post-call entity-state verification; response-service transport regression is covered locally.
- Status: source contract and tests verified; installed Stable response-service and Memento end-to-end verification remain deployment gates.
