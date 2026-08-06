# Gateway UI package and component catalog

## Goal

Build a presentation-only internal UI package for the Home Assistant Gateway frontend. The package will provide reusable, typed primitives that follow the visual and interaction language of Home Assistant while remaining locally owned and independent of Home Assistant private components. A first-class UI Catalog view will render every primitive in representative light/dark, responsive, and interactive states before application views consume it.

## Non-goals

- Do not move application state, API clients, authorization policy, or infrastructure into the UI package.
- Do not import Lit DOM/framework details into application/domain layers outside the presentation boundary.
- Do not copy the native Home Assistant sidebar; the Gateway remains its own dashboard extension.
- Do not claim pixel identity with Home Assistant internals. Match the observable contracts: flat icon tabs, active underline, moderate cards, semantic controls, spacing, typography, status colors, focus, and responsive behavior.

## Architecture

```text
frontend/src/ui/
  ui-types.ts       # public presentation types and variants
  ui-icons.ts       # MDI icon rendering helpers
  ui-primitives.ts  # typed Lit render primitives
  ui-styles.ts      # shared UI token and primitive styles
  ui-catalog-view.ts# catalog-only presentation
```

The existing `GatewayApp` remains the state/action facade. Existing view modules receive typed contexts and call UI primitives. The package accepts content, labels, state, and callbacks; it never creates API clients or reads global configuration.

## Primitive contracts

1. `gatewayIcon` / `gatewayIconButton`: MDI path, accessible name, tooltip, and consistent 20/24px geometry.
2. `gatewayTabGroup` / `gatewayTab`: native `tablist` semantics, flat tab geometry, 2px active indicator, roving keyboard focus.
3. `gatewayCard` / `gatewaySection`: opaque surface, 8px container radius, 1px border, no pill content cards.
4. `gatewayButton`: primary/secondary/danger/link variants, 40px minimum height, loading/disabled/focus states, leading icon support.
5. `gatewayTextField` / `gatewaySelect`: label, help/error, required/disabled semantics and shared field geometry.
6. `gatewayChip` / `gatewayStatus`: compact metadata/status only; pill geometry reserved for these elements.
7. `gatewayAlert`, `gatewayEmptyState`, `gatewayLoadingState`: calm semantic states with live-region semantics where appropriate.
8. `gatewayDialog`: modal semantics and consistent actions.
9. `gatewayDataList` / `gatewayDataRow`: reusable responsive record pattern for primary data on narrow screens.

## Catalog sections

- Foundations: tokens, spacing, radii, typography, borders, focus ring, light/dark surfaces.
- Navigation: icon-only Gateway tabs, active/hover/focus/keyboard states.
- Actions: buttons, icon buttons, loading, disabled and danger states.
- Forms: text field, select, checkbox, validation and disabled states.
- Feedback: status chips, alerts, empty/loading states.
- Containers: cards, sections, data rows and responsive records.
- Overlay: token dialog and confirmation dialog examples.

## Execution slices

1. Create the package API and shared styles; retain compatibility wrappers for current primitives.
2. Add the catalog view and a navigation entry without changing application behavior.
3. Migrate shell/navigation, permission tabs, cards, buttons, fields, tags, alerts and dialogs to the package.
4. Migrate each application view in vertical slices: Overview, Clients, Policy, MCP, Audit, Development.
5. Add source contracts and Playwright coverage for catalog visibility, tab keyboard semantics, dark/light rendering, focus, responsive no-overflow and representative interactions.
6. Run local gates, inspect screenshots, commit and push only on `develop`.

## Acceptance criteria

- Every repeated UI primitive used by application views has one package owner and one documented API.
- The UI Catalog is reachable from the Gateway's top icon-tab bar and does not require live Home Assistant data beyond the existing mocked bootstrap boundary.
- Main navigation is icon-only, flat, and uses an active bottom indicator like the supplied Home Assistant reference.
- Light and dark themes use the same geometry and semantic roles.
- No primitive contains domain/API/authorization logic.
- TypeScript, runtime, architecture, UX, build, accessibility and focused browser tests pass.
- The catalog and package are documented in English; user-facing labels remain localized.
