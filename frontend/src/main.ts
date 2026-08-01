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
type Ready = { status: string; storage: string; mcp: string };
type Discovery = { server_name: string; transport: string; endpoint: string; client_id: string; profile: Profile; capabilities: string[]; tools: string[] };

type View = 'overview' | 'clients' | 'policy' | 'mcp';

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
  };

  @property({ type: String }) view: View = 'overview';
  @state() ready: Ready | null = null;
  @state() clients: Client[] = [];
  @state() busy = false;
  @state() error = '';
  @state() issuedToken = '';
  @state() discovery: Discovery | null = null;

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
    @keyframes drift { from { transform: translate3d(-1%, -1%, 0) scale(1); } to { transform: translate3d(2%, 2%, 0) scale(1.04); } }
    @media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } .split { grid-template-columns: 1fr; } }
    @media (max-width: 720px) { .layout { width: min(100% - 24px, 600px); display: block; padding-top: 12px; } aside { height: auto; position: static; margin-bottom: 18px; } nav { grid-template-columns: repeat(4, 1fr); } nav button { text-align: center; padding: 9px 4px; font-size: 12px; } .side-foot { display: none; } .cards { grid-template-columns: 1fr 1fr; } .topline { display: block; } .status-pill { margin-top: 16px; } }
    @media (prefers-reduced-motion: reduce) { .shell::before { animation: none; } *, *::before, *::after { transition-duration: .01ms !important; } }
  `;

  connectedCallback() { super.connectedCallback(); void this.refresh(); }

  async refresh() {
    this.busy = true; this.error = '';
    try { [this.ready, this.clients] = await Promise.all([api<Ready>('/../ready'), api<Client[]>('/clients')]); }
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

  async loadDiscovery(event: Event) {
    event.preventDefault(); const form = event.target as HTMLFormElement; const token = String(new FormData(form).get('token') ?? '');
    this.busy = true; this.error = '';
    try { this.discovery = await api<Discovery>('/mcp/discovery', { headers: { Authorization: `Bearer ${token}` } }); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load discovery'; }
    finally { this.busy = false; }
  }

  render() {
    const active = this.view;
    return html`<div class="shell"><div class="grid"></div><div class="layout">
      <aside>
        <div class="brand"><div class="brand-mark">⌁</div><div><strong>Gateway</strong><small> control plane</small></div></div>
        <nav aria-label="Gateway navigation">
          ${this.nav('overview', '◈', 'Overview')}${this.nav('clients', '◎', 'Clients')}${this.nav('policy', '◇', 'Policy')}${this.nav('mcp', '⌁', 'MCP')}
        </nav>
        <div class="side-foot"><div class="ok">● observer-first</div><div>Operator capabilities disabled</div></div>
      </aside>
      <main>
        <div class="topline"><div><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>${this.pageTitle()}</h1><p>${this.subtitle()}</p></div><div class="status-pill ${this.ready?.status === 'ready' ? '' : 'warn'}"><span class="dot"></span>${this.ready?.status === 'ready' ? 'Gateway ready' : 'Checking gateway'}</div></div>
        ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : ''}
        ${active === 'overview' ? this.overview() : active === 'clients' ? this.clientsView() : active === 'policy' ? this.policyView() : this.mcpView()}
      </main>
    </div>${this.issuedToken ? this.tokenModal() : ''}</div>`;
  }

  nav(view: View, icon: string, label: string) { return html`<button class=${this.view === view ? 'active' : ''} @click=${() => this.setView(view)}><span aria-hidden="true">${icon}</span> ${label}</button>`; }
  pageTitle() { return ({ overview: 'Secure gateway control plane.', clients: 'Clients & tokens', policy: 'Profiles & policy', mcp: 'MCP transport' } as Record<View, string>)[this.view]; }
  subtitle() { return ({ overview: 'A quiet observatory for identity, readiness and read-only access.', clients: 'Issue independent credentials and revoke them without exposing stored secrets.', policy: 'Review the capability boundaries enforced before any MCP operation.', mcp: 'Inspect the authenticated Streamable HTTP surface exposed to observer clients.' } as Record<View, string>)[this.view]; }
  overview() { const active = this.clients.filter((client) => client.status === 'active').length; return html`<section class="cards"><div class="card"><span class="card-label">Storage</span><strong class="metric ok">${this.ready?.storage ?? '—'}</strong><p>Private SQLite state</p></div><div class="card"><span class="card-label">MCP endpoint</span><strong class="metric ${this.ready?.mcp === 'ready' ? 'ok' : 'warn'}">${this.ready?.mcp ?? '—'}</strong><p>Streamable HTTP</p></div><div class="card"><span class="card-label">Active clients</span><strong class="metric">${active}</strong><p>Bearer identities</p></div><div class="card"><span class="card-label">Operator</span><strong class="metric warn">disabled</strong><p>Observer-only default</p></div></section><div class="split"><div class="card wide"><h2>System posture</h2><p>All management requests are protected by Supervisor Ingress identity. Client tokens are hashed at rest and displayed only once during issuance.</p><div style="margin-top:22px"><span class="tag">Ingress trusted identity</span><span class="tag">SHA-256 token digests</span><span class="tag">read-only MCP</span></div></div><div class="card wide"><h2>Quick actions</h2><div class="form-actions" style="justify-content:flex-start; margin-top:24px"><button class="primary" @click=${() => this.setView('clients')}>Manage clients</button><button class="secondary" @click=${() => this.setView('policy')}>Review policy</button></div></div></div>`; }
  clientsView() { return html`<div class="split"><div class="card"><div class="toolbar"><div><h2>Registered clients</h2><p>Tokens never appear in this list.</p></div><button class="secondary" @click=${() => void this.refresh()} ?disabled=${this.busy}>Refresh</button></div>${this.clients.length ? html`<div class="table-wrap"><table><thead><tr><th>Identity</th><th>Profile</th><th>Capabilities</th><th>Status</th><th></th></tr></thead><tbody>${this.clients.map((client) => html`<tr><td><strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span></td><td><span class="tag">${client.profile}</span></td><td>${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</td><td class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</td><td>${client.status === 'active' ? html`<button class="danger" @click=${() => void this.revoke(client.client_id)} ?disabled=${this.busy}>Revoke</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No clients issued yet.</div>`}</div><div class="card"><h2>Issue observer client</h2><p style="margin-bottom:16px">The token will be shown once after creation.</p><form class="form" @submit=${this.createClient}><label>Client ID<input name="client_id" required maxlength="128" placeholder="nido-observer" /></label><label>Display name<input name="display_name" required maxlength="256" placeholder="Nido house monitor" /></label><label>Profile<select name="profile"><option value="observer">observer · read-only</option><option value="operator" disabled>operator · disabled</option></select></label><label>Capabilities<input name="capabilities" value="ha.read.diagnostics" placeholder="ha.read.diagnostics, ha.read.states" /><small class="muted">Comma-separated capability names.</small></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Issue client</button></div></form></div></div>`; }
  policyView() { return html`<div class="split"><div class="card"><h2>Policy matrix</h2><p>Observer clients may read granted capabilities. Mutations remain denied.</p><div style="margin-top:20px"><div class="tag">read capability → allowed</div><div class="tag">missing capability → denied</div><div class="tag">observer mutation → denied</div><div class="tag">operator → globally disabled</div></div></div><div class="card"><h2>Evaluate a request</h2><form class="form" @submit=${this.evaluatePolicy}><label>Client<select name="client_id">${this.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label><label>Capability<input name="capability" value="ha.read.diagnostics" required /></label><label><span><input name="mutation" type="checkbox" style="width:auto; margin-right:7px" /> mutation request</span></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Evaluate</button></div></form></div></div>`; }
  async evaluatePolicy(event: Event) { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); this.busy = true; try { const result = await api<{ decision: string; reason: string }>('/policy/evaluate', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), capability: data.get('capability'), mutation: data.has('mutation') }) }); window.alert(`${result.decision}: ${result.reason}`); } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to evaluate policy'; } finally { this.busy = false; } }
  mcpView() { return html`<div class="split"><div class="card"><h2>Streamable HTTP</h2><p>Authenticated endpoint</p><div class="token mono" style="margin-top:20px">/mcp/</div><p>Transport: <span class="ok">${this.ready?.mcp ?? 'unknown'}</span></p><p style="margin-top:8px">Tool: <code>gateway_diagnostics</code></p></div><div class="card"><h2>Discovery</h2><p style="margin-bottom:16px">Paste a client token to inspect its scoped metadata. It is sent only in the Authorization header.</p><form class="form" @submit=${this.loadDiscovery}><label>Bearer token<input name="token" type="password" required placeholder="hgw_…" /></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Load discovery</button></div></form>${this.discovery ? html`<div style="margin-top:18px"><span class="tag">${this.discovery.client_id}</span><span class="tag">${this.discovery.profile}</span>${this.discovery.capabilities.map((item) => html`<span class="tag">${item}</span>`)}</div>` : ''}</div></div>`; }
  tokenModal() { return html`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><div class="eyebrow">One-time credential</div><h2>Save this token now</h2><p>This is the only time the plaintext token will be shown. It will not be retrievable later.</p><div class="token mono">${this.issuedToken}</div><div class="form-actions"><button class="secondary" @click=${() => navigator.clipboard?.writeText(this.issuedToken)}>Copy token</button><button class="primary" @click=${() => { this.issuedToken = ''; }}>I saved it</button></div></div></div>`; }
}

customElements.define('gateway-app', GatewayApp);
