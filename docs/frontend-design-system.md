# Frontend design system

The gateway frontend uses a small presentation-only layer in `frontend/src/ui-primitives.ts`.

The layer mirrors Home Assistant's interaction model without importing Home Assistant private components:

- `gatewayButton`: primary, secondary, danger and link actions; submit semantics, disabled/loading state, `aria-busy`, leading icons and shared focus behavior.
- `gatewayTextField`: labelled text, password and search inputs with native validation and consistent field markup.
- `gatewaySelect`: labelled native select with view-owned options.
- `gatewayCard` / `gatewaySection`: shared card surfaces and section headers.
- `gatewayStatus`: status tags with optional contextual classes such as `inline-chip`.
- `gatewayAlert`: alert semantics and tone classes.
- `gatewayEmptyState`: live empty-state semantics.
- `gatewayDialog`: modal surface with labelled dialog semantics and shared action layout.

## Rules

1. Keep application state, API calls and controller callbacks in the owning view/controller.
2. Use primitives for new controls instead of writing a one-off `<button>`, field or empty state.
3. Keep options and domain-specific content in the view; primitives only own presentation and interaction semantics.
4. Use the HA-compatible variables in `app-styles.ts` (`--primary-color`, `--card-background-color`, `--primary-text-color`, and related aliases) instead of hardcoded theme colors.
5. Preserve native controls for checkboxes, tabs and tables when their semantics are more specific than a generic primitive.
6. Validate changes with `pnpm run check`, `pnpm run test:ux`, Playwright accessibility/responsive tests, and visual snapshots in both themes.

The primitives intentionally remain framework-local Lit template helpers. They do not depend on Home Assistant internals, which keeps the add-on independently deployable while allowing future theme integration through the shared CSS variables.
