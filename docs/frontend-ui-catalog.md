# Gateway UI package and Storybook catalog

The frontend owns a presentation-only UI package under `frontend/src/ui/`.

## Run the catalog

```bash
cd frontend
pnpm run storybook
```

Then open `http://localhost:6006`.

The Edge app embeds the same static catalog generated from `develop`. Through Supervisor Ingress, open `/catalog/`. Stable intentionally does not package the catalog.

Build the static catalog with:

```bash
pnpm run storybook:build
```

Storybook provides the professional inspection surface for the Gateway UI package:

- Controls for live args/variants;
- Viewport presets for desktop, tablet and phone;
- Light/dark theme toolbar;
- Accessibility addon;
- Docs generated from CSF stories;
- isolated stories independent of the Gateway runtime;
- a dedicated surface for reviewing focus, disabled, loading, error and responsive states.

## Public component families

The public entry point currently exposes:

- HA-compatible action controls: buttons, icon buttons and loading/disabled states;
- flat tab groups with selected/disabled semantics and keyboard navigation;
- cards, sections, metric cards, toolbars and operational result rows;
- text fields and selects with label, help, error and `aria-describedby` contracts;
- status chips, tag lists, alerts, loading and empty states;
- modal dialogs with stable label/description IDs;
- presentation-only layout helpers for form actions and responsive stacks.

The catalog is the acceptance surface for each family. A family is not considered migrated until its story covers its normal, dark, disabled/loading/error and responsive states and the consuming view uses the public package entry point.


`src/ui/` may depend on Lit, MDI paths and presentation types. It must not import:

- `main.ts`;
- `gateway-controller.ts`;
- `gateway-api.ts`;
- API clients or infrastructure adapters;
- application/domain models.

Stories are also presentation-only. They use fixed fixtures and callbacks; they never call Home Assistant or the Gateway API.

## Design rules

- Main navigation uses flat icon tabs with a bottom active indicator.
- Cards use opaque surfaces, a 1px border and a moderate 8px radius.
- Pills are reserved for compact metadata/status chips.
- Buttons, fields, alerts and dialogs share the same spacing, focus and semantic color tokens.
- MDI icons inherit `currentColor` and keep one consistent visual weight.
- Light and dark themes change tokens, not component geometry.

Application views consume the package through `src/ui/index.ts`. The root `src/ui-primitives.ts` entry point remains a compatibility re-export during migration and contains no independent implementation.
