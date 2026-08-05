# Home Assistant visual references

This directory contains **20 screenshots captured from the public Home Assistant demo**. They are the visual reference set for the Gateway frontend. No Gateway catalog, Storybook, application screenshot, or source-code screenshot is included here.

Source: https://demo.home-assistant.io/
Capture date: 2026-08-05
Data: public demo fixtures only; no Home Assistant account, private instance, credentials, tokens, cookies, or Gateway data.

## Reference set

| # | File | Reference | Viewport |
|---:|---|---|---:|
| 1 | `demo-dashboard-light.png` | Main demo dashboard | 1280x720 |
| 2 | `demo-dashboard-mobile.png` | Main demo dashboard, responsive layout | 390x844 |
| 3 | `demo-overview-second-light.png` | Alternate dashboard with favorites, summaries, rooms and areas | 1280x720 |
| 4 | `demo-map-light.png` | Map view | 1280x720 |
| 5 | `demo-energy-light.png` | Energy overview with distribution, totals and charts | 1280x720 |
| 6 | `menu-settings-light.png` | Settings landing menu | 1280x720 |
| 7 | `menu-settings-mobile.png` | Settings landing menu, responsive layout | 390x844 |
| 8 | `menu-system-light.png` | System settings menu | 1280x720 |
| 9 | `menu-areas-light.png` | Areas and Labels screen | 1280x720 |
| 10 | `menu-automations-light.png` | Automations list, filters, grouping, sorting and empty state | 1280x720 |
| 11 | `menu-automations-mobile.png` | Automations list, responsive layout and bottom navigation | 390x844 |
| 12 | `automation-editor-new-light.png` | New automation editor: When / And if / Then do | 1280x720 |
| 13 | `automation-editor-mobile.png` | New automation editor, responsive layout | 390x844 |
| 14 | `developer-states-light.png` | Developer Tools: States table and entity filters | 1280x720 |
| 15 | `developer-states-mobile.png` | Developer Tools: States table, responsive layout | 390x844 |
| 16 | `developer-services-light.png` | Developer Tools: Actions UI mode | 1280x720 |
| 17 | `developer-services-mobile.png` | Developer Tools: Actions UI mode, responsive layout | 390x844 |
| 18 | `developer-template-light.png` | Developer Tools: Template editor and rendered output | 1280x720 |
| 19 | `developer-events-light.png` | Developer Tools: Event firing and event listeners | 1280x720 |
| 20 | `developer-statistics-light.png` | Developer Tools: Statistics table, search, grouping and sorting | 1280x720 |

## Validation policy

Every retained screenshot was visually inspected after capture. Screens showing `Loading`, blank incomplete routes, or failed demo content were removed rather than counted. The set is intentionally light-theme focused because the public demo maintains its own theme preference; browser `prefers-color-scheme` alone is not treated as evidence of a Home Assistant dark-theme capture.

These images are reference material only. Component contracts must also be checked against the official `home-assistant/frontend` source and current Home Assistant documentation.
