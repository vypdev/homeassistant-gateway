# Frontend design direction

## Framework decision

The management UI will use **Lit + TypeScript**, bundled with Vite for development and production assets.

This is preferred over React for this project because:

- Home Assistant's own frontend is Lit-based;
- a small custom-element bundle is a better fit for a Supervisor App;
- CSS custom properties can mirror Home Assistant theme tokens;
- the UI can run independently behind Ingress while a future custom integration can reuse the same components;
- WebSocket/SSE state updates map naturally to reactive Lit properties.

The app UI will not import private Home Assistant frontend internals. It will use a compatibility token layer and standard web components so that upgrades do not depend on undocumented HA bundles.

## Visual goal

The UI should look native-adjacent, not like a detached SaaS dashboard:

- familiar Home Assistant density and terminology;
- cool blue accent and semantic HA-like status colors;
- dark and light mappings;
- compact cards and tables;
- clear profile/capability boundaries.

The “wow” comes from a quiet ambient layer, live connection beacons, crisp transitions, and meaningful state changes. It must never reduce readability or feel like a game UI.

## Ambient layer

Use CSS-only effects:

- slow radial-gradient drift behind the main canvas;
- a low-opacity connection pulse when the MCP is healthy;
- short route/card transitions;
- no canvas particle system or permanent high-frequency animation.

```css
.gateway-shell::before {
  animation: gateway-ambient 32s ease-in-out infinite alternate;
  background: radial-gradient(circle at 20% 0%, rgb(3 169 244 / 0.14), transparent 42%);
}

@media (prefers-reduced-motion: reduce) {
  .gateway-shell::before { animation: none; }
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
```

## Information architecture

1. Overview
2. MCP servers
3. Clients and tokens
4. Profiles and policies
5. Home Assistant inventory
6. Automations and configuration
7. Audit
8. Diagnostics
9. Settings

The primary navigation always shows the active profile and whether operator capabilities are enabled.

## Accessibility and safety

- WCAG AA contrast target.
- Full keyboard operation.
- Visible focus state.
- Destructive actions require a typed or explicit confirmation step.
- Reduced motion support.
- Never use color alone for health, authorization, or revocation state.
- Never render token values after the one-time issuance view.

## Locale and theme resolution

The UI uses a small public translation catalog (`en`, `es`, `fr`) and falls back by language base (`es-MX` → `es`) and then English. The `/api/ui/context` endpoint first consumes locale/theme hints exposed by the Home Assistant core configuration, then uses the browser `Accept-Language` and `prefers-color-scheme` context. It does not read Home Assistant `.storage` or private frontend internals.

Theme modes are `light`, `dark`, and `auto`. `auto` follows the system/browser preference when Home Assistant does not expose an explicit theme. The visual layer remains observer-only and does not alter Home Assistant settings.

## Development diagnostics

Every upstream probe failure returns a sanitized reason containing only the safe error code, HTTP status, endpoint path, and parameter names. The Development Console exposes a **Copy diagnostic** action for failed probes. The copied object never includes authorization values, query parameter values, response bodies, or Home Assistant state payloads.
