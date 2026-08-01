import { LitElement, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';

type Profile = 'observer' | 'operator';
type Client = {
  client_id: string;
  display_name: string;
  profile: Profile;
  capabilities: string[];
  created_at: string;
  status: string;
  revoked_at: string | null;
};
type Ready = { status: string; storage: string; mcp: string; home_assistant: string };
type AuditEvent = { event_id: string; occurred_at: string; request_id: string; remote_user_id: string | null; action: string; target: string; decision: string; outcome: string; status_code: number };
type Discovery = { server_name: string; transport: string; endpoint: string; client_id: string; profile: Profile; capabilities: string[]; tools: string[] };
type DevelopmentOperation = { name: string; label: string; description: string; kind: string; supports_entity_id: boolean; supports_start_time: boolean };
type DevelopmentPack = { name: string; label: string; description: string; operations: string[] };
type DevelopmentResult = { status: string; operation: string; duration_ms: number; count: number; data?: unknown; reason?: string | null };
type DevelopmentReport = { report_id: string; occurred_at: string; operation: string; status: string; duration_ms: number; total_count: number; schema_fingerprint: string; comparison?: { previous_report_id: string; count_delta: number; schema_changed: boolean } | null };
type DevelopmentCatalog = { enabled: boolean; upstream: string; operations: DevelopmentOperation[]; packs: DevelopmentPack[]; mutations: { status: string; reason: string; approval_required: boolean } };

type View = 'overview' | 'clients' | 'policy' | 'mcp' | 'audit' | 'development';

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(new URL(`./api${path}`, document.baseURI), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
};

export class GatewayApp extends LitElement {
  static properties = {
    view: { type: String },
    ready: { state: true },
    clients: { state: true },
    busy: { state: true },
    error: { state: true },
    issuedToken: { state: true },
    discovery: { state: true },
    audit: { state: true },
    development: { state: true },
    developmentReports: { state: true },
  };

  @property({ type: String }) view: View = 'overview';
  @state() ready: Ready | null = null;
  @state() clients: Client[] = [];
  @state() busy = false;
  @state() error = '';
  @state() issuedToken = '';
  @state() discovery: Discovery | null = null;
  @state() audit: AuditEvent[] = [];
  @state() development: DevelopmentCatalog | null = null;
  @state() developmentReports: DevelopmentReport[] = [];
  @state() developmentResults: DevelopmentResult[] = [];
  @state() developmentOutput: unknown = null;
  @state() developmentEntity = '';
  @state() developmentStartTime = '';

  static styles = css`
    :host { display: block; color: #e7f0fb; min-height: 100vh; font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    .shell { min-height: 100vh; position: relative; overflow: hidden; background: #07111f; }
    .shell::before { content: ''; position: fixed; inset: -20%; pointer-events: none; background: radial-gradient(circle at 18% 0%, #087fb52b, transparent 34%), radial-gradient(circle at 90% 20%, #234b9c22, transparent 36%); animation: drift 32s ease-in-out infinite alternate; }
    .grid { position: fixed; inset: 0; opacity: .16; pointer-events: none; background-image: linear-gradient(#6fa8d30d 1px, transparent 1px), linear-gradient(90deg, #6fa8d30d 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(to bottom, black, transparent 85%); }
    .layout { position: relative; width: min(1360px, calc(100% - 40px)); margin: auto; display: grid; grid-template-columns: 230px 1fr; gap: 28px; padding: 28px 0; }
    aside { border: 1px solid #23415e; border-radius: 20px; background: #0b1929dd; padding: 20px 14px; height: calc(100vh - 56px); position: sticky; top: 28px; display: flex; flex-direction: column; }
    .brand { padding: 4px 10px 26px; display: flex; gap: 10px; align-items: center; }
    .brand-mark { width: 34px; height: 34px; border: 1px solid #4bc9ff; border-radius: 11px; display: grid; place-items: center; color: #54d1ff; box-shadow: 0 0 22px #16a9ef55; }
    .brand strong { display: block; letter-spacing: -.02em; }
    .brand small, .muted { color: #8ea5bd; }
    nav { display: grid; gap: 5px; }
    nav button { border: 0; color: #8ea5bd; background: transparent; text-align: left; border-radius: 10px; padding: 11px 12px; cursor: pointer; font: inherit; }
    nav button:hover, nav button.active { color: #e7f0fb; background: #16466b88; }
    nav button.active { box-shadow: inset 2px 0 #4bc9ff; }
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
    .card { border: 1px solid #23415e; border-radius: 16px; background: #0c1b2ddd; padding: 18px; box-shadow: 0 18px 50px #0003; }
    .card strong.metric { display: block; margin-top: 8px; font-size: 28px; letter-spacing: -.04em; }
    .card-label { color: #8ea5bd; font-size: 12px; }
    .wide { min-height: 180px; }
    .split { display: grid; grid-template-columns: 1.3fr .7fr; gap: 14px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    button.primary, button.secondary, button.danger { border: 1px solid transparent; border-radius: 9px; padding: 9px 13px; color: #031522; background: #63d8ff; cursor: pointer; font: 700 13px inherit; }
    button.secondary { color: #c5e8ff; background: #123651; border-color: #2b6184; }
    button.danger { color: #ffd7d7; background: #552b3a; border-color: #91455a; }
    button:disabled { opacity: .55; cursor: wait; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 620px; }
    th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #1b3550; }
    th { color: #8ea5bd; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
    td { color: #d7e8f7; }
    code, .mono { color: #9bdbff; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12px; }
    .tag { display: inline-block; color: #9bdbff; background: #123651; border: 1px solid #27516a; border-radius: 999px; padding: 3px 8px; margin: 2px 3px 2px 0; font-size: 11px; }
    .ok { color: #67e2a0; } .warn { color: #ffd27d; } .bad { color: #ff8e9e; }
    .form { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; color: #8ea5bd; font-size: 12px; }
    input, select, textarea { width: 100%; border: 1px solid #2a4e6d; border-radius: 8px; padding: 10px 11px; color: #e7f0fb; background: #071522; font: inherit; }
    textarea { min-height: 70px; resize: vertical; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .alert { border: 1px solid #91455a; border-radius: 10px; padding: 10px 12px; color: #ffb9c1; background: #552b3a66; margin-bottom: 15px; }
    .token { word-break: break-all; border: 1px dashed #4bc9ff; border-radius: 10px; padding: 14px; color: #b8ecff; background: #052a4055; margin: 12px 0; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px; background: #020812aa; backdrop-filter: blur(6px); }
    .modal { width: min(560px, 100%); border: 1px solid #3b7796; border-radius: 18px; background: #0b1b2c; padding: 22px; box-shadow: 0 30px 100px #0009; }
    .empty { padding: 28px 10px; text-align: center; color: #8ea5bd; }
    .dev-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px; }
    .dev-output { max-height: 420px; overflow: auto; white-space: pre-wrap; word-break: break-word; border: 1px solid #23415e; border-radius: 10px; padding: 14px; background: #06101b; color: #b8ecff; font: 12px/1.5 "JetBrains Mono", ui-monospace, monospace; }
    .result-list { display: grid; gap: 8px; margin-top: 14px; }
    .pack-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
    .pack-grid button { display: grid; gap: 3px; text-align: left; }
    .pack-grid small { color: #8ea5bd; }
    .result-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; border: 1px solid #1b3550; border-radius: 9px; padding: 9px 10px; }
    .blocked { border-color: #805d35; background: #3a281233; }
    @keyframes drift { from { transform: translate3d(-1%, -1%, 0) scale(1); } to { transform: translate3d(2%, 2%, 0) scale(1.04); } }
    @media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } .split { grid-template-columns: 1fr; } }
    @media (max-width: 720px) { .layout { width: min(100% - 24px, 600px); display: block; padding-top: 12px; } aside { height: auto; position: static; margin-bottom: 18px; } nav { grid-template-columns: repeat(4, 1fr); } nav button { text-align: center; padding: 9px 4px; font-size: 12px; } .side-foot { display: none; } .cards { grid-template-columns: 1fr 1fr; } .topline { display: block; } .status-pill { margin-top: 16px; } }
    @media (prefers-reduced-motion: reduce) { .shell::before { animation: none; } *, *::before, *::after { transition-duration: .01ms !important; } }
  `;

  connectedCallback() { super.connectedCallback(); void this.refresh(); }

  async refresh() {
    this.busy = true; this.error = '';
    try { [this.ready, this.clients, this.audit, this.development, this.developmentReports] = await Promise.all([api<Ready>('/../ready'), api<Client[]>('/clients'), api<AuditEvent[]>('/audit'), api<DevelopmentCatalog>('/development/catalog'), api<DevelopmentReport[]>('/development/reports')]); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load gateway state'; }
    finally { this.busy = false; }
  }

  setView(view: View) { this.view = view; this.error = ''; }

  async createClient(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true; this.error = '';
    try {
      const result = await api<Client & { token: string }>('/clients', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), display_name: data.get('display_name'), profile: data.get('profile'), capabilities: String(data.get('capabilities') ?? '').split(',').map((item) => item.trim()).filter(Boolean) }) });
      this.issuedToken = result.token; form.reset(); await this.refresh();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to issue client'; }
    finally { this.busy = false; }
  }

  async revoke(clientId: string) {
    if (!window.confirm(`Revoke client ${clientId}? This cannot be undone.`)) return;
    this.busy = true;
    try { await api<void>(`/clients/${encodeURIComponent(clientId)}/revoke`, { method: 'POST' }); await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to revoke client'; }
    finally { this.busy = false; }
  }

  async rotate(clientId: string) {
    if (!window.confirm(`Rotate credentials for ${clientId}? The current token will stop working.`)) return;
    this.busy = true; this.error = '';
    try { const result = await api<Client & { token: string }>(`/clients/${encodeURIComponent(clientId)}/rotate`, { method: 'POST' }); this.issuedToken = result.token; await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to rotate client'; }
    finally { this.busy = false; }
  }

  async loadDiscovery(event: Event) {
    event.preventDefault(); const form = event.target as HTMLFormElement; const token = String(new FormData(form).get('token') ?? '');
    this.busy = true; this.error = '';
    try { this.discovery = await api<Discovery>('/mcp/discovery', { headers: { Authorization: `Bearer ${token}` } }); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load discovery'; }
    finally { this.busy = false; }
  }

  async loadDevelopmentReports() {
    try { this.developmentReports = await api<DevelopmentReport[]>('/development/reports'); } catch { /* execution result remains visible */ }
  }

  async runDevelopment(operation: string) {
    this.busy = true; this.error = '';
    const parameters: Record<string, string> = {};
    const definition = this.development?.operations.find((item) => item.name === operation);
    if (definition?.supports_entity_id && this.developmentEntity) parameters.entity_id = this.developmentEntity;
    if (definition?.supports_start_time && this.developmentStartTime) parameters.start_time = this.developmentStartTime;
    try {
      const result = await api<DevelopmentResult>('/development/run', { method: 'POST', body: JSON.stringify({ operation, parameters }) });
      this.developmentResults = [result]; this.developmentOutput = result.data ?? result; await this.loadDevelopmentReports();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to run development probe'; }
    finally { this.busy = false; }
  }

  async runAllDevelopment() {
    this.busy = true; this.error = '';
    try {
      const result = await api<{ status: string; operation: string; results: DevelopmentResult[] }>('/development/run', { method: 'POST', body: JSON.stringify({ operation: 'all', parameters: {} }) });
      this.developmentResults = result.results; this.developmentOutput = result.results; await this.loadDevelopmentReports();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to run development probes'; }
    finally { this.busy = false; }
  }

  async runDevelopmentPack(pack: string) {
    this.busy = true; this.error = '';
    try {
      const result = await api<{ status: string; operation: string; results: DevelopmentResult[] }>('/development/run', { method: 'POST', body: JSON.stringify({ operation: `pack:${pack}`, parameters: {} }) });
      this.developmentResults = result.results; this.developmentOutput = result.results; await this.loadDevelopmentReports();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to run development pack'; }
    finally { this.busy = false; }
  }

  render() {
    const active = this.view;
    return html`<div class="shell"><div class="grid"></div><div class="layout">
      <aside>
        <div class="brand"><div class="brand-mark">⌁</div><div><strong>Gateway</strong><small> control plane</small></div></div>
        <nav aria-label="Gateway navigation">
          ${this.nav('overview', '◈', 'Overview')}${this.nav('development', '⚗', 'Dev Console')}${this.nav('clients', '◎', 'Clients')}${this.nav('policy', '◇', 'Policy')}${this.nav('mcp', '⌁', 'MCP')}${this.nav('audit', '◌', 'Audit')}
        </nav>
        <div class="side-foot"><div class="ok">● observer-first</div><div>Operator capabilities disabled</div></div>
      </aside>
      <main>
        <div class="topline"><div><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>${this.pageTitle()}</h1><p>${this.subtitle()}</p></div><div class="status-pill ${this.ready?.status === 'ready' ? '' : 'warn'}"><span class="dot"></span>${this.ready?.status === 'ready' ? 'Gateway ready' : 'Checking gateway'}</div></div>
        ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : ''}
        ${active === 'overview' ? this.overview() : active === 'development' ? this.developmentView() : active === 'clients' ? this.clientsView() : active === 'policy' ? this.policyView() : active === 'mcp' ? this.mcpView() : this.auditView()}
      </main>
    </div>${this.issuedToken ? this.tokenModal() : ''}</div>`;
  }

  nav(view: View, icon: string, label: string) { return html`<button class=${this.view === view ? 'active' : ''} @click=${() => this.setView(view)}><span aria-hidden="true">${icon}</span> ${label}</button>`; }
  pageTitle() { return ({ overview: 'Secure gateway control plane.', development: 'Development Console', clients: 'Clients & tokens', policy: 'Profiles & policy', mcp: 'MCP transport', audit: 'Sanitized audit trail' } as Record<View, string>)[this.view]; }
  subtitle() { return ({ overview: 'A quiet observatory for identity, readiness and read-only access.', development: 'Run every observer probe internally and see exactly where retrieval succeeds or fails.', clients: 'Issue independent credentials and revoke them without exposing stored secrets.', policy: 'Review the capability boundaries enforced before any MCP operation.', mcp: 'Inspect the authenticated Streamable HTTP surface exposed to observer clients.', audit: 'Trace decisions and outcomes without exposing request secrets.' } as Record<View, string>)[this.view]; }

  overview() { const active = this.clients.filter((client) => client.status === 'active').length; return html`<section class="cards"><div class="card"><span class="card-label">Storage</span><strong class="metric ok">${this.ready?.storage ?? '—'}</strong><p>Private SQLite state</p></div><div class="card"><span class="card-label">Home Assistant</span><strong class="metric ${this.ready?.home_assistant === 'ready' ? 'ok' : 'warn'}">${this.ready?.home_assistant ?? '—'}</strong><p>Supervisor upstream</p></div><div class="card"><span class="card-label">Active clients</span><strong class="metric">${active}</strong><p>Bearer identities</p></div><div class="card"><span class="card-label">Audit events</span><strong class="metric">${this.audit.length}</strong><p>Sanitized records</p></div></section><div class="split"><div class="card wide"><h2>System posture</h2><p>All management requests are protected by Supervisor Ingress identity. Client tokens are hashed at rest and displayed only once during issuance.</p><div style="margin-top:22px"><span class="tag">Ingress trusted identity</span><span class="tag">SHA-256 token digests</span><span class="tag">read-only MCP</span></div></div><div class="card wide"><h2>Quick actions</h2><div class="form-actions" style="justify-content:flex-start; margin-top:24px"><button class="primary" @click=${() => this.setView('clients')}>Manage clients</button><button class="secondary" @click=${() => this.setView('audit')}>View audit</button></div></div></div>`; }

  developmentView() {
    const catalog = this.development;
    return html`<div class="dev-grid">
      <div class="card">
        <div class="toolbar"><div><h2>Observer probes</h2><p>Internal Ingress-only verification surface.</p></div><button class="primary" @click=${() => void this.runAllDevelopment()} ?disabled=${this.busy || !catalog?.enabled}>Run all</button></div>
        <div class="pack-grid">${catalog?.packs.map((pack) => html`<button class="secondary" @click=${() => void this.runDevelopmentPack(pack.name)} ?disabled=${this.busy || !catalog.enabled}><strong>${pack.label}</strong><small>${pack.description}</small></button>`)}</div>
        <p>Upstream: <span class=${catalog?.upstream === 'ready' ? 'ok' : 'warn'}>${catalog?.upstream ?? 'loading'}</span>. Each probe uses the same read adapter that MCP clients use.</p>
        <div class="form" style="margin-top:16px">
          <label>Entity filter<input .value=${this.developmentEntity} @input=${(event: Event) => { this.developmentEntity = (event.target as HTMLInputElement).value; }} placeholder="light.kitchen (optional)" /></label>
          <label>Start time<input .value=${this.developmentStartTime} @input=${(event: Event) => { this.developmentStartTime = (event.target as HTMLInputElement).value; }} placeholder="2026-08-01T00:00:00Z (optional)" /></label>
        </div>
        <div class="result-list">${catalog?.operations.map((operation) => html`<div class="result-row"><div><strong>${operation.label}</strong><br><span class="muted">${operation.description}</span></div><button class="secondary" @click=${() => void this.runDevelopment(operation.name)} ?disabled=${this.busy || !catalog.enabled}>Run</button></div>`)}</div>
      </div>
      <div class="card">
        <div class="toolbar"><div><h2>Execution evidence</h2><p>Count, latency, status and sanitized payload.</p></div>${this.developmentResults.length ? html`<span class="tag">${this.developmentResults.length} result(s)</span>` : ''}</div>
        ${this.developmentResults.length ? html`<div class="result-list">${this.developmentResults.map((result) => html`<div class="result-row"><span><strong>${result.operation}</strong> <span class=${result.status === 'ok' ? 'ok' : 'bad'}>${result.status}</span></span><span class="mono">${result.count} items · ${result.duration_ms} ms</span></div>`)}</div><pre class="dev-output">${JSON.stringify(this.developmentOutput, null, 2)}</pre>` : html`<div class="empty">Run a probe to inspect the exact adapter response.</div>`}
        ${this.developmentReports.length ? html`<h3 style="margin-top:18px">Historical evidence</h3><div class="result-list">${this.developmentReports.map((report) => html`<div class="result-row"><span><strong>${report.operation}</strong> <span class=${report.status === 'ok' ? 'ok' : 'warn'}>${report.status}</span><br><span class="muted">${new Date(report.occurred_at).toLocaleString()} · ${report.schema_fingerprint.slice(0, 12)}</span></span><span class="mono">${report.total_count} items${report.comparison ? ` · Δ ${report.comparison.count_delta}` : ''}${report.comparison?.schema_changed ? ' · schema changed' : ''}</span></div>`)}</div>` : ''}
        <div class="card blocked" style="margin-top:14px"><h3>Mutation probes</h3><p><span class="warn">Blocked by design.</span> Configuration writes, automation changes and service calls require the future approval/idempotency/rollback flow.</p><div style="margin-top:10px"><span class="tag">approval required</span><span class="tag">operator disabled</span><span class="tag">no MCP mutation</span></div></div>
      </div>
    </div>`;
  }

  clientsView() { return html`<div class="split"><div class="card"><div class="toolbar"><div><h2>Registered clients</h2><p>Tokens never appear in this list.</p></div><button class="secondary" @click=${() => void this.refresh()} ?disabled=${this.busy}>Refresh</button></div>${this.clients.length ? html`<div class="table-wrap"><table><thead><tr><th>Identity</th><th>Profile</th><th>Capabilities</th><th>Status</th><th></th></tr></thead><tbody>${this.clients.map((client) => html`<tr><td><strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span></td><td><span class="tag">${client.profile}</span></td><td>${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</td><td class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</td><td>${client.status === 'active' ? html`<button class="danger" @click=${() => void this.revoke(client.client_id)} ?disabled=${this.busy}>Revoke</button><button class="secondary" @click=${() => void this.rotate(client.client_id)} ?disabled=${this.busy}>Rotate</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No clients issued yet.</div>`}</div><div class="card"><h2>Issue observer client</h2><p style="margin-bottom:16px">The token will be shown once after creation.</p><form class="form" @submit=${this.createClient}><label>Client ID<input name="client_id" required maxlength="128" placeholder="nido-observer" /></label><label>Display name<input name="display_name" required maxlength="256" placeholder="Nido house monitor" /></label><label>Profile<select name="profile"><option value="observer">observer · read-only</option><option value="operator" disabled>operator · disabled</option></select></label><label>Capabilities<input name="capabilities" value="ha.read.diagnostics" placeholder="ha.read.diagnostics, ha.read.states" /><small class="muted">Comma-separated capability names.</small></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Issue client</button></div></form></div></div>`; }

  auditView() { return html`<div class="card"><div class="toolbar"><div><h2>Sanitized audit events</h2><p>Request bodies, credentials, tokens and digests are never stored here.</p></div><div><select @change=${(event: Event) => this.loadAudit((event.target as HTMLSelectElement).value)}><option value="">All decisions</option><option value="allowed">Allowed</option><option value="denied">Denied</option><option value="approval_required">Approval required</option></select></div></div>${this.audit.length ? html`<div class="table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Decision</th><th>Outcome</th><th>Request ID</th></tr></thead><tbody>${this.audit.map((event) => html`<tr><td class="mono">${new Date(event.occurred_at).toLocaleString()}</td><td>${event.action}</td><td class="mono">${event.target}</td><td class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</td><td>${event.outcome} · ${event.status_code}</td><td class="mono">${event.request_id}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No audit events match the selected filter.</div>`}</div>`; }

  async loadAudit(decision: string) { this.busy = true; try { this.audit = await api<AuditEvent[]>(`/audit?limit=100${decision ? `&decision=${encodeURIComponent(decision)}` : ''}`); } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load audit'; } finally { this.busy = false; } }
  policyView() { return html`<div class="split"><div class="card"><h2>Policy matrix</h2><p>Observer clients may read granted capabilities. Mutations remain denied.</p><div style="margin-top:20px"><div class="tag">read capability → allowed</div><div class="tag">missing capability → denied</div><div class="tag">observer mutation → denied</div><div class="tag">operator → globally disabled</div></div></div><div class="card"><h2>Evaluate a request</h2><form class="form" @submit=${this.evaluatePolicy}><label>Client<select name="client_id">${this.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label><label>Capability<input name="capability" value="ha.read.diagnostics" required /></label><label><span><input name="mutation" type="checkbox" style="width:auto; margin-right:7px" /> mutation request</span></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Evaluate</button></div></form></div></div>`; }
  async evaluatePolicy(event: Event) { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); this.busy = true; try { const result = await api<{ decision: string; reason: string }>('/policy/evaluate', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), capability: data.get('capability'), mutation: data.has('mutation') }) }); window.alert(`${result.decision}: ${result.reason}`); } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to evaluate policy'; } finally { this.busy = false; } }
  mcpView() { return html`<div class="split"><div class="card"><h2>Streamable HTTP</h2><p>Authenticated endpoint</p><div class="token mono" style="margin-top:20px">/mcp/</div><p>Transport: <span class="ok">${this.ready?.mcp ?? 'unknown'}</span></p><p style="margin-top:8px">Tool: <code>gateway_diagnostics</code></p></div><div class="card"><h2>Discovery</h2><p style="margin-bottom:16px">Paste a client token to inspect its scoped metadata. It is sent only in the Authorization header.</p><form class="form" @submit=${this.loadDiscovery}><label>Bearer token<input name="token" type="password" required placeholder="hgw_…" /></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Load discovery</button></div></form>${this.discovery ? html`<div style="margin-top:18px"><span class="tag">${this.discovery.client_id}</span><span class="tag">${this.discovery.profile}</span>${this.discovery.capabilities.map((item) => html`<span class="tag">${item}</span>`)}</div>` : ''}</div></div>`; }
  tokenModal() { return html`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><div class="eyebrow">One-time credential</div><h2>Save this token now</h2><p>This is the only time the plaintext token will be shown. It will not be retrievable later.</p><div class="token mono">${this.issuedToken}</div><div class="form-actions"><button class="secondary" @click=${() => navigator.clipboard?.writeText(this.issuedToken)}>Copy token</button><button class="primary" @click=${() => { this.issuedToken = ''; }}>I saved it</button></div></div></div>`; }
}

customElements.define('gateway-app', GatewayApp);
