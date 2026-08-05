# Gateway UI package and Storybook catalog

The frontend owns a presentation-only UI package under `frontend/src/ui/`.

## Run the catalog

```bash
cd frontend
pnpm run storybook
```

Then open `http://localhost:6006`.

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

## Package boundary

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
