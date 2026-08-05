---
version: 1.0
name: Home Assistant Gateway
status: adopted
source_reviewed: 2026-08-05
---

# Home Assistant Gateway design line

## 1. Purpose and scope

This document defines the visual, interaction, responsive, accessibility, and asynchronous-operation design line for the Home Assistant Gateway frontend.

The goal is not to copy Home Assistant's application or to claim that this add-on is an official Home Assistant frontend. The goal is to make the Gateway feel native to the Home Assistant ecosystem while keeping its security boundary, operator capabilities, and MCP control-plane responsibilities explicit.

The Gateway is a control plane. It is not a marketing page, a generic analytics dashboard, or a decorative observability screen. Information density is useful, but actions that change authorization, clients, policy, or Home Assistant access must be deliberate, explainable, cancellable where possible, and locally observable.

This document is normative for this repository unless a more specific component contract, accessibility requirement, or security requirement is stricter.

## 2. Source authority and evidence levels

Home Assistant does not publish one single, immutable design-system specification covering every frontend detail. The current design line must therefore be reconstructed from the following official sources, in this order:

1. **Official Home Assistant frontend repository guidance**
   - Repository: <https://github.com/home-assistant/frontend>
   - Current agent/developer guidance: <https://github.com/home-assistant/frontend/blob/dev/AGENTS.md>
   - The guidance describes the Lit/TypeScript architecture, `ha-*` components, current Web Awesome wrappers, theme custom properties, spacing tokens, mobile-first layout, RTL-safe CSS, localization, and accessibility expectations.

2. **Official Home Assistant frontend styling guidance**
   - Styling skill: <https://github.com/home-assistant/frontend/blob/dev/.agents/skills/ha-frontend-styling/SKILL.md>
   - This is repository guidance rather than a public product specification. It is authoritative evidence for how the Home Assistant frontend currently expects contributors to style components.

3. **Official token source in the frontend repository**
   - Core tokens: <https://github.com/home-assistant/frontend/blob/dev/src/resources/theme/core.globals.ts>
   - The file currently defines border widths, border radii, spacing, animation durations, and reduced-motion duration overrides.

4. **Official developer documentation**
   - Developer documentation: <https://developers.home-assistant.io/>
   - Frontend area: <https://developers.home-assistant.io/docs/frontend/>
   - This documents the supported development context, but it is not a complete visual specification.

5. **Official user documentation**
   - Dashboards: <https://www.home-assistant.io/dashboards/>
   - Cards: <https://www.home-assistant.io/dashboards/cards/>
   - This establishes that Home Assistant dashboards are composed of cards that display information and provide controls. It does not prescribe that every third-party control plane must use the same layout.

### Evidence labels used in this document

- **Official rule**: directly stated in official Home Assistant repository or documentation guidance.
- **Official implementation fact**: observed in the current official frontend source, such as a token value or component convention.
- **Gateway decision**: a deliberate rule for this repository. It is compatible with Home Assistant but is not claimed to be an upstream Home Assistant rule.
- **Inference**: a reasoned conclusion from the official architecture or source. It must not be quoted as an official requirement.
- **Requires verification**: a point that needs checking against the exact Home Assistant version or a live installation before making a stronger claim.

## 3. Core design principles

### 3.1 Native feeling without identity confusion

**Gateway decision:** use Home Assistant terminology, semantic states, spacing rhythm, control behavior, and theme integration patterns where they are relevant, but retain a visible Gateway identity and a visible observer/operator security boundary.

The interface must make these facts clear:

- this is a Gateway control plane;
- read-only observer access is different from operator access;
- operator actions can change authorization or Home Assistant access;
- a token, client, grant, or service-policy change has security consequences;
- a successful transport response does not necessarily mean that every unrelated Gateway resource has been refreshed.

Do not present an unofficial local token as an upstream Home Assistant token. Do not use Home Assistant branding in a way that implies the add-on is maintained by Home Assistant.

### 3.2 Data before decoration

**Gateway decision:** operational information takes precedence over ambient effects, gradients, glow, and background grids.

Decorative treatment must never:

- reduce text contrast;
- obscure a focus ring;
- compete with an error, warning, or confirmation;
- communicate a status that is not backed by state;
- make a control look enabled when it is not;
- increase motion for users who requested reduced motion.

### 3.3 Local state, local feedback

**Inference from Home Assistant's reactive frontend model and Gateway requirements:** independent resources must have independent loading, error, empty, and success states.

A slow or failed request for one resource must not disable unrelated controls or replace the entire application with a global loading state.

The Gateway therefore distinguishes:

- initial bootstrap state;
- explicit global refresh state;
- clients mutation state;
- clients refresh state;
- audit refresh state;
- discovery state;
- policy save/evaluation state;
- development/catalog/report state;
- health and operational status state.

The global `aria-busy` indicator may communicate that some operation exists, but it must not be used as a global interaction gate.

## 4. Official Home Assistant styling facts

### 4.1 Component architecture

The official frontend guidance states that Home Assistant uses strict TypeScript and Lit-based Web Components.

The current conventions are:

- Home Assistant components use the `ha-` prefix.
- Lovelace UI components use the `hui-` prefix.
- Dialog components use the `dialog-` prefix.
- New code should prefer `ha-*` components and current Web Awesome wrappers.
- New legacy Material Web Components (`mwc-*`) should not be introduced.
- Leaf components should consume narrow contexts instead of broad application objects where possible.
- Components should keep styles scoped.
- User-facing text must use the translation system.

**Gateway decision:** the Gateway may use its own Lit components and local control implementations because it is not upstream Home Assistant code. It must nevertheless preserve the same principles: strict TypeScript, scoped styles, narrow contracts, localized text, and no new legacy `mwc-*` dependency.

### 4.2 Theme custom properties

The official styling guidance says to use Home Assistant CSS custom properties instead of hardcoded colors and to use spacing tokens instead of hardcoded spacing where practical.

The Gateway currently defines local variables with names such as:

```css
--ha-primary
--ha-primary-hover
--ha-primary-active
--ha-surface
--ha-surface-raised
--ha-surface-muted
--ha-border
--ha-text
--ha-text-secondary
--ha-text-muted
--ha-success
--ha-warning
--ha-danger
--ha-radius-card
--ha-radius-control
--ha-radius-pill
--ha-shadow-card
```

These are **Gateway-local tokens**. They are not automatically the official Home Assistant theme variables merely because they use the `--ha-` prefix.

**Required rule:** future code must either:

1. consume a token supplied by the official Home Assistant environment when the Gateway is embedded and that token's semantics are verified; or
2. consume a documented Gateway token whose name and semantics are explicit; or
3. document why a local literal is required, such as an image asset, a fixed contrast correction, or a test fixture.

Do not create a local variable that has the same name as an official variable but a different meaning.

### 4.3 Official core spacing tokens

The current official `core.globals.ts` defines a 4 px spacing scale:

| Token | Value |
|---|---:|
| `--ha-space-1` | 4 px |
| `--ha-space-2` | 8 px |
| `--ha-space-3` | 12 px |
| `--ha-space-4` | 16 px |
| `--ha-space-5` | 20 px |
| `--ha-space-6` | 24 px |
| `--ha-space-7` | 28 px |
| `--ha-space-8` | 32 px |
| `--ha-space-9` | 36 px |
| `--ha-space-10` | 40 px |
| `--ha-space-11` | 44 px |
| `--ha-space-12` | 48 px |
| `--ha-space-13` | 52 px |
| `--ha-space-14` | 56 px |
| `--ha-space-15` | 60 px |
| `--ha-space-16` | 64 px |
| `--ha-space-17` | 68 px |
| `--ha-space-18` | 72 px |
| `--ha-space-19` | 76 px |
| `--ha-space-20` | 80 px |

**Gateway rule:** use this rhythm for new layout decisions. In particular:

- 4 px: icon/detail separation or very tight metadata spacing;
- 8 px: compact control groups, chips, and inline action gaps;
- 12 px: field groups, compact cards, and responsive record rows;
- 16 px: normal card padding and section spacing;
- 24 px: major section separation;
- 32 px or more: shell and page-level separation.

Existing values do not need to be rewritten mechanically. New changes must avoid inventing arbitrary values when an existing token expresses the intended rhythm.

### 4.4 Official core radius tokens

The current official core token source defines:

| Token | Value |
|---|---:|
| `--ha-border-radius-sm` | 4 px |
| `--ha-border-radius-md` | 8 px |
| `--ha-border-radius-lg` | 12 px |
| `--ha-border-radius-xl` | 16 px |
| `--ha-border-radius-2xl` | 20 px |
| `--ha-border-radius-3xl` | 24 px |
| `--ha-border-radius-4xl` | 28 px |
| `--ha-border-radius-5xl` | 32 px |
| `--ha-border-radius-6xl` | 36 px |
| `--ha-border-radius-pill` | 9999 px |
| `--ha-border-radius-circle` | 50% |
| `--ha-border-radius-square` | 0 |

**Gateway rules:**

- Cards and content containers use a card radius, not a pill radius.
- Compact status chips and compact action controls may use the pill radius.
- Development pack cards, result rows, operator-service groups, and other content containers must not inherit pill styling.
- A radius communicates component type: pill means compact status/action; 8–16 px means container/control; circle means circular indicator/avatar; square means deliberately sharp geometry.
- The Gateway's current `12px` card radius and `999px` pill radius are compatible with this scale, but they remain Gateway-local tokens until mapped to the official environment.

### 4.5 Official animation duration tokens

The current official core token source defines:

| Token | Value |
|---|---:|
| `--ha-animation-duration-none` | 1 ms |
| `--ha-animation-duration-instant` | 75 ms |
| `--ha-animation-duration-fast` | 150 ms |
| `--ha-animation-duration-normal` | 250 ms |
| `--ha-animation-duration-slow` | 350 ms |

Under `prefers-reduced-motion: reduce`, the official source maps all durations to approximately no motion (`1ms`).

**Gateway rule:** use these semantic durations, or Gateway aliases with the same meaning, instead of introducing arbitrary transition durations. Ambient motion is optional; functional motion must be short and must not delay interaction.

## 5. Color and contrast policy

### 5.1 What can be claimed exactly

Home Assistant has theme variables and a theme system. The effective color values can vary with theme, mode, and version. Therefore, no single hex value should be described as the universal Home Assistant primary color without specifying the version and theme context.

The Gateway currently uses a blue primary family:

```text
primary: #03A9F4
hover:   #0288D1
active:  #0277BD
```

This is a **Gateway compatibility choice**, not a claim that every Home Assistant installation uses these exact values.

### 5.2 Semantic color rules

Color is semantic, not decorative:

- primary: navigation focus and the main non-destructive action;
- success: confirmed healthy or completed state;
- warning: attention required but not necessarily blocked;
- danger: destructive action or blocked/error state;
- neutral/muted: secondary information and inactive controls.

Every meaningful status must also have text, structure, an icon, or another non-color signal. A green/red dot alone is insufficient.

### 5.3 Contrast

The Gateway must meet WCAG AA for normal text and essential control affordances. Each light and dark combination must be tested after the final foreground, background, border, hover, active, disabled, and focus colors are applied.

Do not assume that white text is valid on a bright blue primary background. The repository previously required a dark foreground for the light-theme primary button because white text on the bright primary blue did not meet the required contrast ratio.

Focus indicators must remain visible in both themes and against adjacent surfaces. A focus ring must not be removed merely because a button has a border or a colored background.

## 6. Typography and content

### 6.1 Typography

The current Gateway uses an Inter/system sans stack. This is a Gateway decision, not an assertion that Inter is the universal Home Assistant application font.

Rules:

- use a sans-serif family for prose, labels, navigation, and actions;
- use monospace only for tokens, IDs, service names, raw diagnostics, and code-like values;
- preserve readable line height for body text;
- use sentence case for user-facing text unless a product name or technical identifier requires another form;
- do not use uppercase as the primary way to communicate hierarchy;
- labels may use restrained metadata styling, but the label must remain readable at small viewport widths;
- all copy must be localized and must tolerate expansion in other languages.

### 6.2 Hierarchy

The page hierarchy is:

1. page title and current operational context;
2. section title;
3. explanatory text;
4. data and controls;
5. metadata and technical identifiers.

Do not use a larger font merely to make a card look important. Importance should be supported by hierarchy, placement, semantics, and state.

### 6.3 Terminology

Use stable, explicit terms:

- **client**: an authorization subject registered with the Gateway;
- **token**: an issued credential;
- **revoke**: permanently invalidate the client's authorization path according to the security contract;
- **delete**: physically remove a previously revoked client record;
- **observer**: read-only capability boundary;
- **operator**: capability boundary that may include explicitly granted changes;
- **global ceiling**: the maximum set of services allowed by Gateway policy;
- **effective grants**: the grants assigned to one client after applying the global ceiling.

Do not use “delete” when the operation only revokes a token. Do not describe a global policy ceiling as if it were a client's effective grants.

## 7. Components and layout

### 7.1 Cards and surfaces

Official Home Assistant documentation describes dashboards as collections of cards that display information and provide controls. The Gateway uses cards for bounded sections of control-plane information.

Gateway card rules:

- one card represents one coherent responsibility or information group;
- cards use a low-contrast border and a surface distinct from the page canvas;
- cards do not use excessive elevation, glassmorphism, or decorative blur;
- card headers explain the purpose before showing actions;
- destructive or security-sensitive actions are visually and structurally separated;
- a card must have a usable empty, loading, error, and success state where applicable;
- cards must not become horizontal-scroll traps on narrow screens.

### 7.2 Buttons

Buttons represent actions. They must have:

- a localized action label;
- a visible focus state;
- hover, active, disabled, and loading behavior where applicable;
- a clear destructive variant for irreversible or high-impact actions;
- a leading icon only when the icon adds recognition and does not replace the text label;
- no emoji used as a substitute for a consistent icon system;
- a touch target appropriate for mobile use.

The Gateway currently uses a compact 40 px minimum control height. This is a Gateway implementation decision and must remain subject to accessibility testing at every responsive viewport.

Buttons must not be disabled because an unrelated resource is loading. A button may be disabled because:

- its own operation is active;
- its own required input is invalid;
- the action is unauthorized;
- executing it would violate a known safety invariant;
- an explicit confirmation is pending.

### 7.3 Inputs and forms

Inputs and selects use the same control radius and focus treatment as buttons. Labels must be associated with controls. Validation errors must be local, understandable, translated, and safe to show; backend exception text must not be copied directly into the UI when it may contain sensitive data.

Forms must preserve entered values during unrelated refreshes. An asynchronous refresh must not silently reset a user's in-progress input.

### 7.4 Chips, tags, and status indicators

Chips are compact metadata or status elements, not general-purpose containers.

Rules:

- use short text;
- use a pill radius only for compact chips;
- do not place long prose inside a chip;
- do not rely on chip color alone;
- keep enough separation from the label or value that the chip cannot be mistaken for part of the preceding word;
- allow wrapping on narrow screens;
- preserve readable spacing when a topology value wraps.

### 7.5 Tables and responsive records

Desktop tables may be used for dense client and audit data. On narrow screens, the Gateway may switch to responsive records/cards rather than forcing a wide table.

The responsive representation must:

- preserve the same information and actions;
- preserve reading order;
- expose labels for values that were represented by table headers;
- allow long IDs and service names to wrap safely;
- avoid horizontal overflow;
- retain keyboard and screen-reader access to actions.

Responsive wrapping is a valid layout state, not an error. Tests must verify no overlap and no horizontal overflow rather than requiring every label and chip to remain on one line.

## 8. Responsive, RTL, and accessibility rules

### 8.1 Responsive behavior

The layout is mobile-first in behavior even if desktop is the primary presentation.

At narrow widths:

- navigation becomes a compact layout;
- grids collapse to one column where two-column content is no longer readable;
- toolbars wrap instead of overflowing;
- action groups may become full-width rows;
- cards reduce padding while preserving touch targets;
- technical strings wrap at safe boundaries;
- no fixed-width element may force document-level horizontal scrolling.

### 8.2 RTL safety

Styles must be RTL-safe:

- prefer logical properties such as `margin-inline`, `padding-inline`, `inset-inline`, and `border-start-*` where appropriate;
- do not use left/right assumptions for semantic ordering;
- icons that communicate direction must mirror when their meaning is directional;
- code, tokens, IDs, and URLs may remain LTR where that is their semantic representation;
- test layouts with long localized strings and RTL locales.

### 8.3 Keyboard and assistive technology

Required behavior:

- every interactive control is reachable by keyboard;
- focus is visible and not clipped;
- icon-only controls have an accessible name;
- decorative icons use `aria-hidden="true"`;
- loading state is announced locally where necessary;
- `aria-busy` is scoped to the region that is actually busy whenever possible;
- confirmation dialogs identify the action and its consequence;
- errors are associated with the relevant control or region;
- semantic headings and landmarks are preserved;
- status is not communicated by color alone.

## 9. Asynchronous interaction design

This section is a Gateway architectural rule derived from the reactive, component-oriented nature of the Home Assistant frontend and from the Gateway's security and control-plane requirements. It is not presented as an upstream Home Assistant API contract.

### 9.1 Separate bootstrap from resource refresh

`loadBootstrap()` is allowed to assemble the initial application state because the application needs a coherent first render.

After the application is usable, unrelated resources must be refreshed independently:

```text
initial navigation
  -> global bootstrap
  -> render application

client mutation
  -> client endpoint
  -> update/refetch clients only
  -> release client operation state
  -> optional secondary refresh in background
```

The following must not be required for a client mutation to complete:

- health/details;
- development reports;
- audit refresh;
- discovery;
- operator status;
- service policy;
- unrelated UI context.

### 9.2 Independent operation state

Every asynchronous resource owns:

- an operation state (`idle`, `loading`, `success`, `error`, or a more precise state model);
- an abort controller where cancellation is meaningful;
- a request/version identity where stale responses are possible;
- local feedback and error presentation;
- a defined reconciliation strategy.

An operation may share a transport adapter, but it must not share a UI lock with an unrelated operation.

### 9.3 Dependencies are explicit

Independent calls may run in parallel. Real dependencies remain sequential.

Examples:

- create client -> display issued token -> refresh clients;
- revoke client -> refresh that client or the clients list;
- revoke client -> delete client is sequential because deletion requires prior revocation;
- save policy -> evaluate policy may be sequential if evaluation must use the persisted policy;
- bootstrap -> render dependent views is sequential;
- audit refresh and health refresh are independent unless the API contract explicitly says otherwise.

Do not serialize requests merely because they were historically placed in one bootstrap method.

### 9.4 Cancellation and stale responses

When a newer operation supersedes an older operation:

- abort the older request where possible;
- retain a monotonically increasing request/version identity;
- ignore late results from an obsolete request;
- do not let an obsolete `finally` block clear the busy state of a newer request;
- do not show an error for an intentional abort unless the UX explicitly needs to explain it;
- reconcile with the server after optimistic updates when the contract requires it.

### 9.5 No global loading illusion

A local operation must not replace the whole application with “Checking Gateway” after the initial bootstrap has completed.

“Checking Gateway” is reserved for:

- the initial application readiness state;
- an explicit global health/readiness check;
- a clearly labeled global refresh that the user initiated.

A client mutation must show client-local progress. A policy save must show policy-local progress. A development run must show development-local progress.

## 10. Motion and ambient background

The Gateway currently includes a restrained dot-field and slow gradient movement. This is a Gateway decision, not a Home Assistant requirement.

Rules:

- ambient motion must remain subordinate to operational data;
- motion must not be necessary to understand state;
- no perpetual particle field or parallax effect may be introduced without a demonstrated product purpose;
- all non-essential motion stops or becomes effectively instantaneous under `prefers-reduced-motion: reduce`;
- loading feedback must remain understandable without animation;
- motion must not change layout in a way that causes accidental clicks or focus loss.

The current app uses slow ambient durations longer than the official functional animation tokens. That is acceptable only because the motion is ambient and is explicitly disabled for reduced-motion users. Functional transitions should use the official semantic range: instant/fast/normal/slow.

## 11. Security-specific visual rules

The visual system must reinforce, not soften, authorization boundaries.

### Observer/operator boundary

- observer and operator modes must be distinguishable;
- operator-only controls must not appear as ordinary read actions;
- unavailable operator actions must explain the relevant policy or authorization condition;
- the UI must not imply that selecting a capability grants it globally;
- global service policy and per-client grants must be summarized separately.

### Destructive operations

Revocation and physical deletion are distinct:

- revocation invalidates future authorization according to the security contract;
- deletion removes a previously revoked record;
- deletion must require the prior revoked state;
- confirmation must state the consequence;
- the UI must not silently turn deletion into revocation or vice versa;
- errors must be safe and must not expose backend internals or credentials.

## 12. Verification requirements

Every visual or interaction change must be verified at the appropriate level:

### Static and contract checks

- TypeScript check;
- architecture boundary check;
- i18n coverage check;
- runtime contract validation;
- `git diff --check`;
- package-manager policy check using pnpm only.

### Browser checks

- Chromium;
- Firefox;
- Mobile Chromium;
- WebKit when the local environment provides its native dependencies.

Test at minimum:

- light and dark themes;
- narrow/mobile and desktop widths;
- keyboard focus;
- reduced motion;
- empty, loading, success, error, unauthorized, and stale-response states;
- long localized labels;
- no horizontal overflow;
- no overlapping labels/chips/actions;
- independent operations with one deliberately slow endpoint;
- concurrent operations with out-of-order responses.

### Review questions

Before accepting a change, answer:

1. Is this an official Home Assistant rule, an implementation observation, or a Gateway decision?
2. Does the new component use the existing token/radius/spacing semantics?
3. Does it remain usable in light, dark, narrow, RTL, high-contrast, and reduced-motion conditions?
4. Does it disable only the controls that are actually unsafe or busy?
5. Can an obsolete response overwrite current state?
6. Does the copy explain the security consequence in localized language?
7. Is the claim supported by a source, a test, or both?

## 13. Known limits and maintenance

- Home Assistant's frontend is actively changing, including migration from legacy Material-based components to Web Awesome-based components. Revalidate component names and APIs against the target Home Assistant release before integrating upstream components.
- Theme variables are runtime inputs and may be overridden by the user's theme. Never hardcode an assumption about the effective installation palette without testing the target environment.
- This document describes the Gateway's compatibility line. It does not promise pixel identity with every Home Assistant release, theme, device class, or custom dashboard.
- A live Home Assistant installation is required to verify effective theme inheritance, Ingress rendering, browser-specific behavior, and any runtime component API. Those claims must remain marked as requiring verification until tested against the target installation.

## 14. Change log

### 1.0 — 2026-08-05

- Replaced the previous informal design description with a source-backed design line.
- Added official evidence hierarchy and explicit distinction between upstream facts and Gateway decisions.
- Documented official spacing, radius, and animation tokens from the Home Assistant frontend source.
- Added responsive, RTL, accessibility, security, and asynchronous-operation rules.
- Documented the separation between global bootstrap and independent resource operations.
