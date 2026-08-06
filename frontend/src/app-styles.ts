import { css } from 'lit';

export const APP_STYLES = css`
    :host { --gateway-space-1: 4px; --gateway-space-2: 8px; --gateway-space-3: 12px; --gateway-space-4: 16px; --gateway-space-6: 24px; --gateway-space-8: 32px; --ha-canvas: #07111f; --ha-primary: #03a9f4; --ha-primary-hover: #0288d1; --ha-primary-active: #0277bd; --ha-surface: #0c1b2d; --ha-surface-raised: #12263a; --ha-surface-muted: #071522; --ha-border: #29465f; --ha-text: #e7f0fb; --ha-text-secondary: #9fb8cc; --ha-text-muted: #718aa0; --ha-success: #67e2a0; --ha-warning: #ffd27d; --ha-danger: #ff8e9e; --ha-radius-card: 8px; --ha-radius-control: 8px; --ha-radius-pill: 9999px; --ha-shadow-card: none; display: block; color: var(--ha-text); min-height: 100vh; font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    .shell { min-height: 100vh; position: relative; background: var(--ha-canvas); }
    .shell.light { --ha-canvas: #f4f7fb; --ha-primary: #03a9f4; --ha-primary-hover: #0288d1; --ha-primary-active: #0277bd; --ha-surface: #ffffff; --ha-surface-raised: #f8fbfe; --ha-surface-muted: #edf3f7; --ha-border: #c7d6e1; --ha-text: #243447; --ha-text-secondary: #607286; --ha-text-muted: #718394; --ha-success: #217346; --ha-warning: #a66f16; --ha-danger: #b34b58; --ha-shadow-card: none; color: var(--ha-text); background: var(--ha-canvas); }
    .shell.light aside, .shell.light .card { background: var(--ha-surface); border-color: var(--ha-border); box-shadow: none; }
    .shell.light .brand small, .shell.light .card-label { color: #607286; }
    .shell.light .tab-navigation { border-color: var(--ha-border); }
    .shell.light .navigation-tab { color: var(--ha-text-secondary); }
    .shell.light .navigation-tab:hover:not([aria-selected="true"]) { color: var(--ha-text); background: transparent; }
    .shell.light .navigation-tab[aria-selected="true"] { color: var(--ha-text); border-bottom-color: var(--ha-text); }
    .shell.light .status-pill { color: #237b54; background: #e7f7ee; border-color: #9bd1b1; }
    .shell.light button.primary { color: #12344d; background: var(--ha-primary); border-color: var(--ha-primary-active); }
    .shell.light button.primary:hover:not(:disabled) { color: #12344d; background: var(--ha-primary-hover); border-color: var(--ha-primary-active); }
    .shell.light button.secondary { color: var(--ha-text); background: var(--ha-surface-raised); border-color: var(--ha-border); }
    .shell.light button.secondary:hover:not(:disabled) { color: var(--ha-text); background: var(--ha-surface-muted); border-color: var(--ha-primary); }
    .shell.light button.danger { color: #ffffff; background: #8a3d54; border-color: #713044; }
    .shell.light button.danger:hover:not(:disabled) { color: #ffffff; background: #713044; border-color: #5e2638; }
    .shell.light .result-row { border-color: #c8d6e1; background: #f8fbfd; }
    .shell.light code, .shell.light .mono { color: #47728d; }
    .shell.light .tag { color: #365f79; background: #e7f0f5; border-color: #c1d2de; }
    .shell.light .ok { color: #217346; }
    .shell.light .warn { color: #a66f16; }
    .shell.light .bad { color: #b34b58; }
    .shell.light nav button:hover { color: #3c4043; background: #f1f3f4; }
    .shell.light nav button.active { color: #03a9f4; background: #e3f2fd; box-shadow: none; }
    .shell.light th, .shell.light td { border-color: #dbe5ee; } .shell.light td { color: #29445d; }
    .shell.light input, .shell.light select, .shell.light textarea { color: #243447; background: #f8fbfe; border-color: #b9cad9; }
    .shell.light .dev-output { color: #31516b; background: #f5f9fc; border-color: #d3deea; }
    .boot-stage { min-height: min(620px, calc(100vh - 56px)); display: grid; place-items: center; padding: 28px; }
    .boot-card { position: relative; width: min(520px, 100%); padding: 24px; text-align: center; border: 1px solid var(--ha-border); border-radius: var(--ha-radius-card); background: var(--ha-surface); box-shadow: none; }
    .shell.light .boot-card { border-color: var(--ha-border); background: var(--ha-surface); box-shadow: none; }
    .boot-orbit { width: 48px; height: 48px; margin: 0 auto 16px; display: grid; place-items: center; border: 1px solid var(--ha-primary); border-radius: 50%; position: relative; }
    .boot-orbit::before, .boot-orbit::after { content: ''; position: absolute; border-radius: 50%; }
    .boot-orbit::before { width: 7px; height: 7px; top: -4px; left: 19px; background: var(--ha-success); }
    .boot-orbit::after { display: none; }
    .boot-core { width: 16px; height: 16px; border-radius: 50%; background: var(--ha-primary); }
    .shell.light .boot-orbit { border-color: var(--ha-primary); } .shell.light .boot-orbit::before { background: var(--ha-success); } .shell.light .boot-core { background: var(--ha-primary); }
    .boot-card h1 { margin: 0; font-size: clamp(22px, 3vw, 30px); } .boot-card p { max-width: 390px; margin: 10px auto 0; }
    .boot-status { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; color: var(--ha-text-secondary); font-size: 13px; }
    .boot-progress { height: 3px; margin: 18px auto 0; max-width: 300px; overflow: hidden; border-radius: var(--ha-radius-pill); background: var(--ha-surface-muted); }
    .boot-progress::before { content: ''; display: block; width: 42%; height: 100%; border-radius: inherit; background: var(--ha-primary); animation: boot-progress 1.8s ease-in-out infinite; }
    .shell.light .boot-progress { background: var(--ha-surface-muted); } .shell.light .boot-progress::before { background: var(--ha-primary); }
    .boot-retry { margin-top: 24px; }
    .layout { position: relative; width: min(1280px, calc(100% - 32px)); margin: auto; padding: 0 0 var(--gateway-space-8); }
    .app-header { min-width: 0; min-height: 64px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: stretch; gap: var(--gateway-space-4); border-bottom: 1px solid var(--ha-border); }
    .brand { min-width: 176px; padding: 12px 0; display: flex; gap: 10px; align-items: center; }
    .brand-mark { width: 32px; height: 32px; border: 1px solid var(--ha-border); border-radius: 8px; display: block; object-fit: cover; box-shadow: none; }
    .brand strong { display: block; letter-spacing: -.02em; }
    .brand small, .muted { color: #8ea5bd; }
    .header-tools { display: flex; align-items: center; justify-content: flex-end; gap: 12px; min-width: 0; padding: 8px 0; }
    .header-tools .header-language { min-width: 180px; }
    .header-tools .header-language .gateway-select-reference { min-height: 40px; }
    .header-tools label { min-width: 116px; }
    main { min-width: 0; padding: var(--gateway-space-6) 0 42px; }
    .navigation-tabs { min-width: 0; height: 64px; display: flex; align-items: stretch; gap: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
    .navigation-tabs .ui-tab { position: relative; flex: 0 0 48px; min-height: 64px; display: inline-flex; align-items: center; justify-content: center; gap: 0; padding: 0 12px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--ha-text-secondary); background: transparent; cursor: pointer; font: 500 14px/1 inherit; white-space: nowrap; transition: color 150ms ease, border-color 150ms ease; }
    .navigation-tabs .ui-tab:hover:not([aria-selected="true"]) { color: var(--ha-text); background: transparent; }
    .navigation-tabs .ui-tab[aria-selected="true"] { color: var(--ha-text); border-bottom-color: var(--ha-text); }
    .navigation-tabs .ui-tab:focus-visible { outline: 2px solid var(--ha-primary); outline-offset: -2px; }
    .navigation-tabs .ui-tab .ui-tab-icon, .navigation-tabs .ui-tab .navigation-icon { flex: 0 0 22px; width: 22px; height: 22px; fill: currentColor; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .side-foot { display: none; }
    .topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
    .eyebrow { color: #4bc9ff; letter-spacing: .14em; text-transform: uppercase; font-size: 11px; font-weight: 800; }
    h1 { margin: 6px 0; font-size: clamp(28px, 3vw, 34px); letter-spacing: -.02em; line-height: 1.15; }
    h2 { margin: 0 0 5px; font-size: 18px; letter-spacing: -.02em; }
    h3 { margin: 0 0 14px; font-size: 14px; }
    p { margin: 0; color: #8ea5bd; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #27516a; border-radius: 999px; padding: 7px 11px; color: #67e2a0; background: #0c352a55; white-space: nowrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 14px currentColor; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
    .topology-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin: 0; }
    .topology-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
    .overview-actions { justify-content: flex-start; margin-top: 24px; }
    .overview-health, .overview-topology { margin-top: 14px; }
    .topology-card { text-align: center; }
    .mcp-endpoint { margin-top: 20px; }
    .mcp-tool { margin-top: 8px; }
    .mcp-subtitle { margin-bottom: 16px; }
    .mcp-capabilities { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .card { border: 1px solid var(--ha-border); border-radius: var(--ha-radius-card); background: var(--ha-surface); padding: var(--gateway-space-4); box-shadow: none; }
    .card strong.metric { display: block; margin-top: 8px; font-size: 28px; letter-spacing: -.04em; }
    .card-label { color: #8ea5bd; font-size: 12px; }
    .wide { min-height: 180px; }
    .split { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, .7fr); gap: 14px; }
    .split > *, .layout > * { min-width: 0; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    .evidence-toolbar { display: grid; justify-items: end; gap: 10px; min-width: 0; max-width: 100%; }
    .evidence-metrics, .evidence-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 10px; max-width: 100%; }
    button.primary, button.secondary, button.danger { min-height: 40px; border: 1px solid transparent; border-radius: var(--ha-radius-control); padding: 8px 16px; color: #12344d; background: var(--ha-primary); cursor: pointer; font: 500 14px/1.2 inherit; letter-spacing: .01em; box-shadow: none; transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease; }
    .button-leading-icon { display: inline-flex; align-items: center; justify-content: center; width: 1.1em; margin-inline-end: 8px; color: currentColor; font-size: 1.35em; font-weight: 400; line-height: 0; vertical-align: -1px; }
    .button-spinner { width: 14px; height: 14px; margin-inline-end: 8px; border: 2px solid currentColor; border-inline-end-color: transparent; border-radius: 50%; animation: gateway-spin 700ms linear infinite; }
    .gateway-field { display: grid; gap: 6px; }
    .gateway-section { display: grid; gap: var(--gateway-space-4); }
    .gateway-section-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--gateway-space-4); }
    .gateway-empty-state { border: 1px dashed var(--ha-border); background: var(--ha-surface-raised); color: var(--ha-text-secondary); }
    .alert-warning { color: var(--ha-warning); border-color: color-mix(in srgb, var(--ha-warning) 55%, var(--ha-border)); background: color-mix(in srgb, var(--ha-warning) 10%, transparent); }
    .alert-info { color: var(--ha-primary-active); border-color: color-mix(in srgb, var(--ha-primary) 45%, var(--ha-border)); background: color-mix(in srgb, var(--ha-primary) 8%, transparent); }
    @keyframes gateway-spin { to { transform: rotate(360deg); } }
    button.primary:hover:not(:disabled) { background: var(--ha-primary-hover); }
    button.primary:active:not(:disabled) { background: var(--ha-primary-active); }
    button.secondary { color: var(--ha-text); background: var(--ha-surface-raised); border-color: var(--ha-border); box-shadow: none; }
    button.secondary:hover:not(:disabled) { color: var(--ha-text); background: var(--ha-surface-muted); border-color: var(--ha-primary); transform: none; }
    button.secondary:active:not(:disabled) { background: var(--ha-border); }
    button.danger { color: #ffffff; background: #b23a4d; }
    button.danger:hover:not(:disabled) { background: #9d3042; }
    button.danger:active:not(:disabled) { background: #842738; }
    button:focus-visible, nav button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--ha-primary); outline-offset: 2px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .table-wrap { overflow: visible; min-width: 0; }
    .desktop-only { display: block; }
    .responsive-records { display: none; }
    .responsive-record { display: grid; gap: 11px; border: 1px solid #29465f; border-radius: 12px; padding: 14px; background: #07152233; min-width: 0; }
    .responsive-record-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; min-width: 0; }
    .responsive-record-header strong { min-width: 0; overflow-wrap: anywhere; }
    .responsive-field { display: grid; grid-template-columns: minmax(88px, .35fr) minmax(0, 1fr); gap: 10px; align-items: start; min-width: 0; }
    .responsive-field > span:first-child { color: #8ea5bd; font-size: 12px; }
    .responsive-field-stack { grid-template-columns: 1fr; gap: 5px; }
    .responsive-values { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
    .responsive-wrap { min-width: 0; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
    .responsive-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 3px; }
    .shell.light .responsive-record { border-color: #b9cad9; background: #f8fbfe; }
    .shell.light .responsive-field > span:first-child { color: #5d7488; }
    table { width: 100%; border-collapse: collapse; min-width: 0; table-layout: fixed; }
    th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #1b3550; overflow-wrap: anywhere; word-break: break-word; }
    .clients-table th:nth-child(1), .clients-table td:nth-child(1) { width: 24%; }
    .clients-table th:nth-child(2), .clients-table td:nth-child(2) { width: 13%; }
    .clients-table th:nth-child(3), .clients-table td:nth-child(3) { width: 28%; }
    .clients-table th:nth-child(4), .clients-table td:nth-child(4) { width: 12%; }
    .clients-table th:nth-child(5), .clients-table td:nth-child(5) { width: 23%; }
    .clients-table td:nth-child(3) { overflow-wrap: normal; word-break: normal; }
    .clients-table td:nth-child(3) .tag { white-space: nowrap; }
    td { color: #d7e8f7; }
    code, .mono { color: #9bdbff; font-family: ui-monospace, monospace; font-size: 12px; }
    .tag { display: inline-flex; align-items: center; min-height: 24px; color: #b8e8ff; background: #173b55; border: 1px solid #315b75; border-radius: var(--ha-radius-pill); padding: 3px 9px; margin: 2px 3px 2px 0; font-size: 12px; line-height: 1.2; }
    .topology-node { display: inline-flex; align-items: center; justify-content: center; gap: 8px; row-gap: 6px; max-width: 100%; flex-wrap: wrap; }
    .topology-node > strong { overflow-wrap: anywhere; }
    .inline-chip { margin: 0 !important; }
    .ok { color: #67e2a0; } .warn { color: #ffd27d; } .bad { color: #ff8e9e; }
    .result-row .ok, .result-row .warn, .result-row .bad { margin-left: 6px; }
    .form { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; color: var(--ha-text-secondary); font-size: 13px; font-weight: 500; }
    input, select, textarea { width: 100%; min-height: 40px; border: 1px solid #3a5b73; border-radius: var(--ha-radius-control); padding: 9px 11px; color: var(--ha-text); background: var(--ha-surface-muted); font: inherit; }
    textarea { min-height: 70px; resize: vertical; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .alert { border: 1px solid #91455a; border-radius: 10px; padding: 10px 12px; color: #ffb9c1; background: #552b3a66; margin-bottom: 15px; }
    .token { word-break: break-all; border: 1px dashed #4bc9ff; border-radius: 10px; padding: 14px; color: #b8ecff; background: #052a4055; margin: 12px 0; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px; background: #020812aa; }
    .modal { width: min(560px, 100%); border: 1px solid var(--ha-border); border-radius: var(--ha-radius-card); background: var(--ha-surface); padding: 22px; box-shadow: none; }
    .empty { padding: 28px 10px; text-align: center; color: #8ea5bd; }
    .dev-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 20px; align-items: start; }
    .dev-output { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; border: 1px solid #23415e; border-radius: 10px; padding: 14px; background: #06101b; color: #b8ecff; font: 12px/1.5 ui-monospace, monospace; }
    .result-list { display: grid; gap: 8px; margin-top: 14px; }
    .client-form-description { margin-bottom: 16px; }
    .dev-filters { margin-top: 16px; }
    .history-title { margin-top: 18px; }
    .mutation-card { margin-top: 14px; }
    .mutation-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .pack-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
    .pack-grid > button.secondary { border-radius: 8px; text-align: left; }
    .pack-grid button { display: grid; gap: 5px; text-align: left; padding: 12px 13px; min-height: 72px; }
    .pack-grid small { color: #9fb8cc; line-height: 1.4; }
    .capability-toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    .capability-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .capability-grid { display: grid; gap: 12px; padding-right: 1px; }
    .ha-check-control { min-height: 40px; display: inline-flex; align-items: center; gap: 8px; color: var(--ha-text); font-size: 14px; line-height: 1.4; cursor: pointer; }
    .ha-check-control input { width: auto; margin: 0; accent-color: var(--ha-primary); }
    .ha-check-control:has(input:disabled) { cursor: not-allowed; }
    .permission-tabs { display: flex; gap: 0; margin-top: 18px; padding-bottom: 0; border-bottom: 1px solid var(--ha-border); }
    .permission-tab { min-height: 44px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; padding: 10px 16px; color: var(--ha-text-secondary); background: transparent; cursor: pointer; font: 500 13px inherit; }
    .permission-tab[aria-selected="true"] { color: var(--ha-text); background: transparent; border-bottom-color: var(--ha-text); }
    .permission-tab:hover:not([aria-selected="true"]) { color: var(--ha-text); background: transparent; }
    .permission-panel { padding-top: 16px; }
    .permission-panel-description { margin-bottom: 12px; }
    .permission-disabled-note { margin-bottom: 12px; padding: 10px 12px; border: 1px solid #805d35; border-radius: 9px; color: #ffd98a; background: #3a281233; }
    .capability-option { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; border: 1px solid #23415e; border-radius: 10px; padding: 10px; background: #07152299; cursor: pointer; }
    .capability-option:hover { border-color: #4bc9ff; }
    .capability-option input { width: auto; margin-top: 3px; }
    .capability-option strong { display: block; color: #d7e8f7; font-size: 12px; }
    .capability-option small { display: block; color: #8ea5bd; margin-top: 2px; }
    .capability-option:has(input:disabled) { opacity: .52; cursor: not-allowed; }
    .capability-option:has(input:disabled):hover { border-color: #23415e; }
    .capability-option.operator { opacity: 1; cursor: pointer; }
    .capability-option.operator:has(input:disabled) { opacity: .52; cursor: not-allowed; }
    .operator-service-fieldset { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .operator-service-selection-hint { margin: 0; }
    .operator-service-selection-toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; min-width: 0; }
    .operator-service-selection-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .operator-service-option { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; min-width: 0; }
    .operator-service-option > span { min-width: 0; overflow-wrap: anywhere; }
    .operator-service-option .mono { overflow-wrap: anywhere; }
    .policy-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .operator-policy-card { margin-top: 20px; }
    .operator-policy-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
    .operator-policy-header > div { min-width: 0; }
    .operator-policy-notice { display: grid; gap: 6px; margin: 18px 0 14px; padding: 14px 16px; border: 1px solid #3b7796; border-radius: 12px; background: #052a4055; color: #c8e8f7; line-height: 1.45; }
    .operator-policy-notice strong { color: #f1fbff; }
    .operator-policy-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0 10px; }
    .policy-summary-item { display: grid; gap: 4px; min-height: 72px; padding: 12px 13px; border: 1px solid #29465f; border-radius: 10px; background: #07152266; }
    .policy-summary-item strong { color: #d7f5ff; font-size: 22px; line-height: 1; }
    .policy-summary-item span { color: #8ea5bd; font-size: 12px; line-height: 1.35; }
    .operator-policy-change-note { margin: 14px 0 18px; }
    .operator-service-groups { display: grid; gap: 30px; }
    .operator-service-group { display: grid; gap: 13px; padding: 16px; border: 1px solid #29465f; border-radius: 14px; background: #07152233; }
    .operator-service-group-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }
    .operator-service-group-action { flex: 0 0 auto; min-height: 34px; padding: 7px 12px; font-size: 12px; }
    .operator-service-group h3 { margin: 0; color: #cfe5f5; font-size: 15px; letter-spacing: .01em; }
    .operator-service-list { display: grid; gap: 13px; }
    .operator-service-option { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; padding: 16px; border: 1px solid #3d617c; border-radius: 12px; background: #0b2133cc; cursor: pointer; box-shadow: 0 4px 12px #0002; }
    .operator-service-option:hover { border-color: #4bc9ff; background: #0b243699; }
    .operator-service-option input { width: auto; margin-top: 3px; }
    .operator-service-option strong { display: block; color: #d7e8f7; font-size: 13px; line-height: 1.35; }
    .operator-service-option small { display: block; margin-top: 4px; color: #8ea5bd; line-height: 1.4; }
    .operator-service-meta { color: #9ed9b8 !important; }
    .operator-services-empty { display: grid; gap: 8px; padding: 10px 0; color: #cfe5f5; }
    .link-button { width: fit-content; padding: 0; border: 0; color: #63d8ff; background: none; cursor: pointer; font: inherit; text-decoration: underline; }
    .link-button:focus-visible { outline: 3px solid #7ddcff; outline-offset: 3px; }
    .inline-checkbox { width: auto; margin-right: 7px; }
    .shell.light .operator-policy-notice { color: #29445d; background: #edf8fc; border-color: #a6c8d8; }
    .shell.light .operator-policy-notice strong, .shell.light .operator-service-group h3, .shell.light .operator-service-option strong { color: #29445d; }
    .shell.light .policy-summary-item, .shell.light .operator-service-option, .shell.light .operator-service-group { background: #f8fbfe; border-color: #b9cad9; }
    .shell.light .operator-service-option { box-shadow: 0 3px 10px #38516b12; }
    .shell.light .policy-summary-item strong { color: #29445d; }
    .shell.light .policy-summary-item span, .shell.light .operator-service-option small { color: #5d7488; }
    .shell.light .capability-option { background: #f8fbfe; border-color: #b9cad9; }
    .shell.light .capability-option strong { color: #29445d; }
    .result-row { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; border: 1px solid #29465f; border-radius: 10px; padding: 12px 13px; background: #07152233; }
    .blocked { border-color: #805d35; background: #3a281233; }
    @keyframes boot-progress { 0% { transform: translateX(-130%); } 55%, 100% { transform: translateX(250%); } }
    @media (max-width: 900px) { .app-header { display: flex; flex-wrap: wrap; gap: 0; } .brand { flex: 1 1 auto; min-width: 170px; } .header-tools { flex: 0 1 auto; } .tab-navigation { order: 3; flex: 1 0 100%; height: 56px; border-top: 1px solid var(--ha-border); } .navigation-tabs { height: 56px; } .navigation-tabs .ui-tab { min-height: 56px; } }
    @media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } .topology-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .split, .dev-grid { grid-template-columns: 1fr; } }
    @media (max-width: 900px) { .desktop-only { display: none; } .responsive-records { display: grid; gap: 10px; } }
    @media (max-width: 720px) { .layout { width: min(100% - 24px, 600px); display: block; padding-top: 12px; } .brand { padding-block: 12px; } .header-tools { padding-block: 8px; } .header-tools label, .header-tools .header-language { min-width: 0; max-width: 100%; } .header-tools .header-language { width: 177px; flex: 0 1 177px; } .header-tools .header-language .gateway-select-reference { max-width: 100%; } .navigation-tabs .ui-tab { padding-inline: 14px; font-size: 13px; } .navigation-tabs .ui-tab span { overflow-wrap: anywhere; } .cards, .topology-grid, .split, .dev-grid, .pack-grid { grid-template-columns: 1fr; } .topline { display: block; } .topline > div { min-width: 0; } .status-pill { margin-top: 16px; } .toolbar, .capability-toolbar, .permission-tabs, .operator-service-selection-toolbar { flex-wrap: wrap; align-items: flex-start; } .evidence-toolbar { width: 100%; justify-items: start; } .evidence-metrics, .evidence-actions { justify-content: flex-start; } .capability-actions { width: 100%; justify-content: flex-start; } .capability-actions button { flex: 1 1 140px; } .toolbar > div, .toolbar button { min-width: 0; } .toolbar button, .form-actions button { max-width: 100%; } .form-actions { flex-wrap: wrap; } .operator-policy-header { flex-wrap: wrap; } .operator-policy-header > * { max-width: 100%; } .operator-policy-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .result-row { flex-direction: column; } .result-row > * { max-width: 100%; } .pack-grid button { min-width: 0; } .operator-service-selection-actions { width: 100%; justify-content: flex-start; } .operator-service-selection-actions button { flex: 1 1 140px; } .card { min-width: 0; padding: 16px; } h1 { overflow-wrap: anywhere; } }
    @media (prefers-reduced-motion: reduce) { .boot-progress::before, .button-spinner { animation: none; } *, *::before, *::after { transition-duration: 1ms !important; } }
    @media (prefers-contrast: more) { .card, input, select, textarea, .result-row { border-color: currentColor; } .muted, p, label, th { color: currentColor; } .tag, button.secondary { border-color: currentColor; } }
  `;
