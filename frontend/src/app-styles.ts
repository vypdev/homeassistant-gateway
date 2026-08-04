import { css } from 'lit';

export const APP_STYLES = css`
    :host { --ha-primary: #03a9f4; --ha-primary-hover: #0288d1; --ha-primary-active: #0277bd; --ha-surface: #0c1b2d; --ha-surface-raised: #12263a; --ha-surface-muted: #071522; --ha-border: #29465f; --ha-text: #e7f0fb; --ha-text-secondary: #9fb8cc; --ha-text-muted: #718aa0; --ha-success: #67e2a0; --ha-warning: #ffd27d; --ha-danger: #ff8e9e; --ha-radius-card: 12px; --ha-radius-control: 10px; --ha-radius-pill: 999px; --ha-shadow-card: 0 8px 24px #00000024; display: block; color: var(--ha-text); min-height: 100vh; font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    .shell { min-height: 100vh; position: relative; overflow: hidden; background: #07111f; }
    .shell.light { --ha-primary: #03a9f4; --ha-primary-hover: #0288d1; --ha-primary-active: #0277bd; --ha-surface: #ffffff; --ha-surface-raised: #f8fbfe; --ha-surface-muted: #edf3f7; --ha-border: #c7d6e1; --ha-text: #243447; --ha-text-secondary: #607286; --ha-text-muted: #718394; --ha-success: #2d9864; --ha-warning: #a66f16; --ha-danger: #b34b58; --ha-shadow-card: 0 8px 24px #38516b14; color: var(--ha-text); background: #f4f7fb; }
    .shell.light aside, .shell.light .card { background: #ffffffee; border-color: #d3deea; box-shadow: 0 18px 50px #38516b14; }
    .shell.light p, .shell.light .muted, .shell.light .brand small, .shell.light .card-label, .shell.light .side-foot, .shell.light nav button { color: #607286; }
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
    .shell.light .ok { color: #2d9864; }
    .shell.light .warn { color: #a66f16; }
    .shell.light .bad { color: #b34b58; }
    .shell.light nav button:hover { color: #3c4043; background: #f1f3f4; }
    .shell.light nav button.active { color: #03a9f4; background: #e3f2fd; box-shadow: none; }
    .shell.light th, .shell.light td { border-color: #dbe5ee; } .shell.light td { color: #29445d; }
    .shell.light input, .shell.light select, .shell.light textarea { color: #243447; background: #f8fbfe; border-color: #b9cad9; }
    .shell.light .dev-output { color: #31516b; background: #f5f9fc; border-color: #d3deea; }
    .shell.light .grid { opacity: .25; background-image: linear-gradient(#5c88a31c 1px, transparent 1px), linear-gradient(90deg, #5c88a31c 1px, transparent 1px); }
    .shell::before { content: ''; position: fixed; inset: -20%; pointer-events: none; background: radial-gradient(circle at 18% 0%, #087fb52b, transparent 34%), radial-gradient(circle at 90% 20%, #234b9c22, transparent 36%); animation: drift 32s ease-in-out infinite alternate; }
    .dot-field { position: fixed; inset: 0; pointer-events: none; overflow: hidden; opacity: .9; background-image: radial-gradient(circle, #8fc9ed2e 1px, transparent 1.45px); background-size: 24px 24px; mask-image: radial-gradient(ellipse at center, black 12%, transparent 82%); }
    .dot-field::before { content: ''; position: absolute; width: 72vw; height: 58vw; max-width: 980px; max-height: 760px; min-width: 420px; min-height: 330px; left: 14%; top: 8%; background-image: radial-gradient(circle, #b4e6ff 1.35px, transparent 1.9px); background-size: 24px 24px; mask-image: radial-gradient(ellipse at center, black 0%, transparent 68%); opacity: .16; filter: blur(.15px); animation: dot-focus-drift 42s ease-in-out infinite alternate; transform-origin: center; }
    .dot-field__zone { position: absolute; width: 54vw; height: 42vw; max-width: 760px; max-height: 590px; min-width: 360px; min-height: 270px; background-image: radial-gradient(circle, #93d8ff 1.45px, transparent 2px); background-size: 24px 24px; mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%); opacity: .23; filter: blur(.1px); animation: dot-zone-drift 28s ease-in-out infinite alternate; }
    .dot-field__zone--one { top: -12%; left: -10%; }
    .dot-field__zone--two { top: 20%; right: -16%; animation-duration: 34s; animation-delay: -9s; }
    .dot-field__zone--three { bottom: -24%; left: 24%; animation-duration: 40s; animation-delay: -18s; opacity: .16; }
    .shell.light .dot-field { opacity: .78; background-image: radial-gradient(circle, #5e89a52b 1px, transparent 1.45px); }
    .shell.light .dot-field::before { background-image: radial-gradient(circle, #6d9bb8 1.35px, transparent 1.9px); opacity: .13; }
    .shell.light .dot-field__zone { background-image: radial-gradient(circle, #6d9bb8 1.45px, transparent 2px); opacity: .2; }
    .boot-stage { min-height: min(620px, calc(100vh - 56px)); display: grid; place-items: center; padding: 28px; }
    .boot-card { position: relative; width: min(520px, 100%); padding: 42px 38px; text-align: center; border: 1px solid #31536f; border-radius: 22px; background: #071522d9; box-shadow: 0 24px 70px #02081266; backdrop-filter: blur(14px); }
    .shell.light .boot-card { border-color: #c4d5e1; background: #ffffffec; box-shadow: 0 24px 70px #38516b1c; }
    .boot-orbit { width: 74px; height: 74px; margin: 0 auto 24px; display: grid; place-items: center; border: 1px solid #4bc9ff66; border-radius: 50%; position: relative; animation: boot-orbit 5s linear infinite; }
    .boot-orbit::before, .boot-orbit::after { content: ''; position: absolute; border-radius: 50%; }
    .boot-orbit::before { width: 9px; height: 9px; top: -4px; left: 31px; background: #67e2a0; box-shadow: 0 0 18px #67e2a0; }
    .boot-orbit::after { width: 5px; height: 5px; right: 5px; bottom: 13px; background: #4bc9ff; box-shadow: 0 0 14px #4bc9ff; }
    .boot-core { width: 22px; height: 22px; border-radius: 50%; background: #4bc9ff; box-shadow: 0 0 0 8px #4bc9ff1c, 0 0 28px #4bc9ff99; animation: boot-pulse 2.2s ease-in-out infinite; }
    .shell.light .boot-orbit { border-color: #5b9fc066; } .shell.light .boot-orbit::before { background: #2d9864; box-shadow: 0 0 14px #2d986466; } .shell.light .boot-orbit::after { background: #3c88ac; box-shadow: 0 0 12px #3c88ac66; } .shell.light .boot-core { background: #6caec7; box-shadow: 0 0 0 8px #6caec71c, 0 0 24px #6caec766; }
    .boot-card h1 { margin: 0; font-size: clamp(22px, 3vw, 30px); } .boot-card p { max-width: 390px; margin: 10px auto 0; }
    .boot-status { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px; color: #9fb8cc; font-size: 13px; }
    .shell.light .boot-status { color: #607286; }
    .boot-progress { height: 3px; margin: 22px auto 0; max-width: 300px; overflow: hidden; border-radius: 999px; background: #23415e; }
    .boot-progress::before { content: ''; display: block; width: 42%; height: 100%; border-radius: inherit; background: #4bc9ff; animation: boot-progress 1.8s ease-in-out infinite; }
    .shell.light .boot-progress { background: #dbe7ee; } .shell.light .boot-progress::before { background: #75aec2; }
    .boot-retry { margin-top: 24px; }
    .grid { position: fixed; inset: 0; opacity: .16; pointer-events: none; background-image: linear-gradient(#6fa8d30d 1px, transparent 1px), linear-gradient(90deg, #6fa8d30d 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(to bottom, black, transparent 85%); }
    .layout { position: relative; width: min(1360px, calc(100% - 40px)); margin: auto; display: grid; grid-template-columns: 230px 1fr; gap: 28px; padding: 28px 0; }
    aside { border: 1px solid #23415e; border-radius: 20px; background: #0b1929dd; padding: 20px 14px; height: calc(100vh - 56px); position: sticky; top: 28px; display: flex; flex-direction: column; }
    .brand { padding: 4px 10px 26px; display: flex; gap: 10px; align-items: center; }
    .brand-mark { width: 34px; height: 34px; border: 1px solid #4bc9ff66; border-radius: 11px; display: block; object-fit: cover; box-shadow: 0 0 22px #16a9ef55; }
    .brand strong { display: block; letter-spacing: -.02em; }
    .brand small, .muted { color: #8ea5bd; }
    nav { display: grid; gap: 4px; }
    nav button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; border: 0; color: #8ea5bd; background: transparent; text-align: left; border-radius: 8px; padding: 10px 14px; cursor: pointer; font: inherit; }
    nav button:hover { color: #d7e8f7; background: #f1f3f41a; }
    nav button.active { color: #03a9f4; background: #03a9f41f; }
    .navigation-icon { flex: 0 0 24px; width: 24px; height: 24px; fill: currentColor; }
    .side-foot { margin-top: auto; padding: 12px; border-top: 1px solid #23415e; color: #8ea5bd; font-size: 12px; }
    main { min-width: 0; padding: 10px 0 42px; }
    .topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
    .eyebrow { color: #4bc9ff; letter-spacing: .14em; text-transform: uppercase; font-size: 11px; font-weight: 800; }
    h1 { margin: 6px 0; font-size: clamp(28px, 4vw, 46px); letter-spacing: -.045em; line-height: 1.05; }
    h2 { margin: 0 0 5px; font-size: 18px; letter-spacing: -.02em; }
    h3 { margin: 0 0 14px; font-size: 14px; }
    p { margin: 0; color: #8ea5bd; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #27516a; border-radius: 999px; padding: 7px 11px; color: #67e2a0; background: #0c352a55; white-space: nowrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 14px currentColor; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
    .topology-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin: 0; }
    .card { border: 1px solid var(--ha-border); border-radius: var(--ha-radius-card); background: var(--ha-surface); padding: 18px; box-shadow: var(--ha-shadow-card); }
    .card strong.metric { display: block; margin-top: 8px; font-size: 28px; letter-spacing: -.04em; }
    .card-label { color: #8ea5bd; font-size: 12px; }
    .wide { min-height: 180px; }
    .split { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, .7fr); gap: 14px; }
    .split > *, .layout > * { min-width: 0; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    .evidence-toolbar { display: grid; justify-items: end; gap: 10px; min-width: 0; max-width: 100%; }
    .evidence-metrics, .evidence-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 10px; max-width: 100%; }
    button.primary, button.secondary, button.danger { min-height: 40px; border: 1px solid transparent; border-radius: var(--ha-radius-pill); padding: 8px 16px; color: #12344d; background: var(--ha-primary); cursor: pointer; font: 500 14px/1.2 inherit; letter-spacing: .01em; box-shadow: 0 2px 5px #00000026; transition: background-color .15s ease, box-shadow .15s ease, transform .15s ease; }
    .button-leading-icon { display: inline-flex; align-items: center; justify-content: center; width: 1.1em; margin-inline-end: 8px; color: currentColor; font-size: 1.35em; font-weight: 400; line-height: 0; vertical-align: -1px; }
    button.primary:hover:not(:disabled) { background: var(--ha-primary-hover); box-shadow: 0 3px 8px #00000033; }
    button.primary:active:not(:disabled) { background: var(--ha-primary-active); box-shadow: none; transform: translateY(1px); }
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
    .modal-backdrop { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px; background: #020812aa; backdrop-filter: blur(6px); }
    .modal { width: min(560px, 100%); border: 1px solid #3b7796; border-radius: 18px; background: #0b1b2c; padding: 22px; box-shadow: 0 30px 100px #0009; }
    .empty { padding: 28px 10px; text-align: center; color: #8ea5bd; }
    .dev-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 20px; align-items: start; }
    .dev-output { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; border: 1px solid #23415e; border-radius: 10px; padding: 14px; background: #06101b; color: #b8ecff; font: 12px/1.5 ui-monospace, monospace; }
    .result-list { display: grid; gap: 8px; margin-top: 14px; }
    .pack-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
    .pack-grid > button.secondary { border-radius: 8px; text-align: left; }
    .pack-grid button { display: grid; gap: 5px; text-align: left; padding: 12px 13px; min-height: 72px; }
    .pack-grid small { color: #9fb8cc; line-height: 1.4; }
    .capability-toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    .capability-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .capability-grid { display: grid; gap: 12px; padding-right: 1px; }
    .permission-tabs { display: flex; gap: 8px; margin-top: 18px; padding-bottom: 8px; border-bottom: 1px solid #29465f; }
    .permission-tab { border: 1px solid #315b75; border-radius: 9px 9px 0 0; padding: 10px 14px; color: #b8d9eb; background: #173b55; cursor: pointer; font: 700 13px inherit; }
    .permission-tab[aria-selected="true"] { color: #ffffff; background: #126b8f; border-color: #2585aa; }
    .permission-tab:hover:not([aria-selected="true"]) { color: #ffffff; background: #28506d; }
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
    @keyframes boot-orbit { to { transform: rotate(360deg); } }
    @keyframes boot-pulse { 0%, 100% { transform: scale(.82); opacity: .72; } 50% { transform: scale(1.12); opacity: 1; } }
    @keyframes boot-progress { 0% { transform: translateX(-130%); } 55%, 100% { transform: translateX(250%); } }
    @keyframes drift { from { transform: translate3d(-1%, -1%, 0) scale(1); } to { transform: translate3d(2%, 2%, 0) scale(1.04); } }
    @keyframes dot-zone-drift { from { transform: translate3d(-8%, -5%, 0) scale(.92); } to { transform: translate3d(10%, 8%, 0) scale(1.12); } }
    @keyframes dot-focus-drift { 0% { transform: translate3d(-8%, -5%, 0) scale(.86); } 38% { transform: translate3d(5%, 8%, 0) scale(1.02); } 72% { transform: translate3d(12%, -4%, 0) scale(.94); } 100% { transform: translate3d(-3%, 10%, 0) scale(1.1); } }
    @media (max-width: 1100px) { .split, .dev-grid { grid-template-columns: 1fr; } }
    @media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } .topology-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .split, .dev-grid { grid-template-columns: 1fr; } }
    @media (max-width: 1600px) { .desktop-only { display: none; } .responsive-records { display: grid; gap: 10px; } }
    @media (max-width: 720px) { .layout { width: min(100% - 24px, 600px); display: block; padding-top: 12px; } aside { height: auto; position: static; margin-bottom: 18px; } nav { grid-template-columns: repeat(4, 1fr); } nav button { justify-content: center; flex-direction: column; gap: 4px; text-align: center; padding: 8px 4px; min-height: 58px; font-size: 11px; } nav button span { overflow-wrap: anywhere; } .navigation-icon { flex-basis: 22px; width: 22px; height: 22px; } .side-foot { display: none; } .cards, .topology-grid, .split, .dev-grid, .pack-grid { grid-template-columns: 1fr; } .topline { display: block; } .topline > div { min-width: 0; } .status-pill { margin-top: 16px; } .toolbar, .capability-toolbar, .permission-tabs, .operator-service-selection-toolbar { flex-wrap: wrap; align-items: flex-start; } .evidence-toolbar { width: 100%; justify-items: start; } .evidence-metrics, .evidence-actions { justify-content: flex-start; } .capability-actions { width: 100%; justify-content: flex-start; } .capability-actions button { flex: 1 1 140px; } .toolbar > div, .toolbar button { min-width: 0; } .toolbar button, .form-actions button { max-width: 100%; } .form-actions { flex-wrap: wrap; } .operator-policy-header { flex-wrap: wrap; } .operator-policy-header > * { max-width: 100%; } .operator-policy-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .result-row { flex-direction: column; } .result-row > * { max-width: 100%; } .pack-grid button { min-width: 0; } .operator-service-selection-actions { width: 100%; justify-content: flex-start; } .operator-service-selection-actions button { flex: 1 1 140px; } .card { min-width: 0; padding: 16px; } h1 { overflow-wrap: anywhere; } }
    @media (prefers-reduced-motion: reduce) { .shell::before, .dot-field::before, .dot-field__zone, .boot-orbit, .boot-core, .boot-progress::before { animation: none; } *, *::before, *::after { transition-duration: .01ms !important; } }
    @media (prefers-contrast: more) { .card, aside, input, select, textarea, .result-row { border-color: currentColor; } .muted, p, label, th { color: currentColor; } .tag, button.secondary { border-color: currentColor; } }
  `;
