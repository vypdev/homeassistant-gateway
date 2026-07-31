---
version: alpha
name: Home Assistant Gateway
description: A native-feeling observability and control surface for Home Assistant.
colors:
  canvas: "#0B0F14"
  surface: "#111820"
  surfaceElevated: "#17212B"
  text: "#F3F7FA"
  textMuted: "#A7B4BF"
  primary: "#03A9F4"
  accentStrong: "#00C6FF"
  success: "#4CAF50"
  warning: "#FFB300"
  danger: "#B71C1C"
  glow: "#0A84FF"
typography:
  display:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 2.25rem
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  heading:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 0.6875rem
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: 8px
  md: 14px
  lg: 20px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  elevated-card:
    backgroundColor: "{colors.surfaceElevated}"
    textColor: "{colors.textMuted}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  primary-action:
    backgroundColor: "{colors.primary}"
    textColor: "#061018"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  primary-action-hover:
    backgroundColor: "{colors.accentStrong}"
    textColor: "#061018"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "#061018"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "#061018"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  status-glow:
    backgroundColor: "{colors.glow}"
    textColor: "#061018"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  danger-action:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

## Overview

The Gateway UI should feel like it belongs inside Home Assistant while making the gateway's security boundary visible. It is a control plane, not a marketing page: information density is useful, but every high-impact action must be deliberate.

The visual language combines Home Assistant-compatible surfaces and status colors with a restrained observability-console layer: thin borders, quiet gradients, status beacons, and a cool blue accent.

## Colors

- **Canvas:** deep blue-black background for the gateway's own Ingress document.
- **Surface:** cards and navigation surfaces; avoid pure black so elevation remains visible.
- **Accent:** Home Assistant-compatible electric blue for focus, links, and healthy connectivity.
- **Success/warning/danger:** reserved for operational status, never decoration.
- **Glow:** used only for ambient background gradients and active status beacons.

The UI must also provide a light-theme token mapping and use system/theme information where available. Color is never the only status signal.

## Typography

Use Inter or the system sans stack. Keep headings compact and labels uppercase only for metadata. Numbers and IDs may use a monospace face, but prose and actions remain sans-serif.

## Layout

- Persistent left rail on desktop; compact top bar on narrow screens.
- Overview is a responsive grid of status cards, not a wall of widgets.
- Client and audit tables support keyboard navigation, filtering, and clear empty states.
- Operator actions appear in a separate high-risk action area, never beside observer-only read actions without a boundary marker.

## Motion

Ambient motion is subtle: a 20–40 second gradient drift, status beacon breathing, and short transitions for panel changes. No perpetual particle field, parallax, or motion that competes with data.

All non-essential motion is disabled under `prefers-reduced-motion: reduce`. Loading uses a stable skeleton or progress indicator instead of a spinner-only experience.

## Components

Cards use a 1px border, low elevation, and a faint radial accent glow only when a connection is healthy or an operation is active. Buttons have clear focus rings and distinct destructive styling. Tokens and clients use compact status chips with text and icon, not color alone.

## Do's and Don'ts

- Do reuse Home Assistant terminology and status semantics.
- Do make the observer/operator boundary visible on every relevant screen.
- Do show what will happen before a mutation is confirmed.
- Do keep animations quiet and disable them for reduced-motion users.
- Don't mimic the Home Assistant UI so closely that the gateway's security boundary disappears.
- Don't hide operator capabilities in a generic settings screen.
- Don't use glassmorphism, noisy particles, or decorative graphs without operational meaning.
