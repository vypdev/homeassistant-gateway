# Responsive Content Visibility and Dense-UI Redesign Plan

## Objective

Ensure every user-visible content block remains understandable and reachable on phones, tablets, landscape devices and desktops. A layout is not considered responsive merely because the document has no global horizontal scrollbar: essential information must not be hidden behind unexplained inner scrolling or clipped columns.

## Scope

1. Audit all tables, diagnostic rows, code/output blocks, toolbars, cards, forms and navigation surfaces.
2. Identify information that is currently only reachable by horizontal scrolling.
3. Replace dense tables on narrow viewports with responsive stacked records/cards while preserving tables for wider viewports where they improve comparison.
4. Preserve technical identifiers and complete values through wrapping, disclosure or dedicated rows; never silently truncate essential content.
5. Add strict browser contracts for:
   - no document-level overflow;
   - no essential content clipped or outside the viewport;
   - all table records reachable without horizontal scrolling on phone widths;
   - every required label/value available in the accessibility tree;
   - code/diagnostic content wrapped or deliberately disclosed;
   - desktop/tablet layouts retain usable comparison density.
6. Review dark/light visual baselines on phone, tablet and desktop.
7. Verify the development server and production bundle separately.

## Design rules

- Phone widths below 600px: cards/stacked records; no horizontal scrolling for primary information.
- Tablet widths 600–999px: responsive cards or compact two-column records depending on content density.
- Desktop widths at or above 1000px: tables/grids may be used when all columns remain readable.
- Long IDs, paths and capability names: wrap at safe boundaries (`overflow-wrap:anywhere`), never clip.
- Diagnostic JSON and traces: bounded readable blocks with wrapping and optional explicit expansion; no page overflow.
- Horizontal scrolling is allowed only for genuinely tabular secondary data and must be explicitly labelled; it is not a substitute for responsive design of primary content.
- All transformations must preserve localization, semantics, keyboard navigation and copy/export actions.

## Execution order

1. Audit current DOM/CSS and establish failing tests for the existing mobile table behavior.
2. Extract reusable responsive presentation helpers/classes rather than duplicating view-specific hacks.
3. Implement responsive variants for dense tables/rows in Clients, Audit, MCP and Development Console.
4. Add long-content fixtures covering IDs, paths, descriptions, Unicode and translated text.
5. Add strict Playwright assertions and visual snapshots for phone, tablet and desktop.
6. Run all browser projects available locally and the production preview.
7. Run type-check, runtime/UX/i18n gates, build, backend tests, Ruff, compileall and diff hygiene.
8. Document the final interaction model and any intentionally scrollable secondary content.

## Acceptance criteria

The work is complete only when the following are true:

- At `320x568`, `360x800`, `390x844` and `414x896`, every primary record's label and value is visible without horizontal scrolling.
- At tablet and desktop sizes, content remains visually grouped and comparison-friendly.
- `document.documentElement.scrollWidth <= viewport.width` for all tested states.
- No essential element has `scrollWidth > clientWidth` unless it is an explicitly labelled secondary disclosure.
- Accessibility scans remain clean and all transformed records expose meaningful names/values.
- Visual review confirms readable spacing, wrapping, contrast and hierarchy in dark/light themes.
- Dev-server and production-preview suites both pass.

## Execution result

Completed on 2026-08-04:

- Found the primary responsive defect: Clients and Audit exposed essential records only through tables with `min-width: 620px` on narrow screens.
- Replaced the narrow-screen presentation with semantic responsive records at `max-width: 900px`.
- Kept desktop tables for comparison at widths above 900px.
- Added wrapping for client IDs, operator grants, audit targets and request IDs.
- Added strict matrix assertions for all ten viewports and both presentation modes.
- Added visible-content containment checks for responsive records and cards.
- Chromium full suite: 44 passed.
- Firefox full suite: 28 passed.
- Mobile Chromium full suite: 28 passed after adapting the test to the responsive presentation.
- Production preview responsive subset: 16 passed.
- Visual snapshots updated for Clients phone themes and reviewed.
- Backend tests: 146 passed; Ruff, compileall and frontend gates passed.

Known environment limitation: WebKit remains unavailable locally because required system libraries are not installed; CI is configured to install WebKit with dependencies.
