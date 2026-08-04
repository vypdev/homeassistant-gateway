import { LitElement, html } from 'lit';
import { downloadDiagnostic as downloadDiagnosticFile, copyDiagnostic as copyDiagnosticFile, copyProblemReports as copyProblemReportsFile } from './diagnostics-service';
import { api } from './api';
import { CAPABILITY_DEFINITIONS } from './capabilities';
import { capabilitiesAfterProfileChange, capabilitiesForProfile, toggleCapability as applyCapabilityToggle } from './capability-policy';
import { selectedOperatorServices, toggleOperatorServiceGroupSelection, toggleOperatorServiceSelection } from './operator-policy';
import { resolveLocale, resolveTheme, translate } from './locale';
import { capabilityText as resolveCapabilityText, operationText as resolveOperationText, packText as resolvePackText, pageSubtitle, pageTitle, statusText as resolveStatusText } from './view-helpers';
import { navigationView } from './navigation-view';
import { neuralBackground } from './shell-view';
import { overviewView, healthView, topologyView } from './overview-view';
import { auditView } from './audit-view';
import { clientsView as renderClientsView } from './clients-view';
import { developmentView as renderDevelopmentView } from './development-view';
import { policyView as renderPolicyView } from './policy-view';
import { mcpView as renderMcpView } from './mcp-view';
import { loadDevelopmentReports, executeDevelopmentJob } from './development-controller';
import { property, state } from 'lit/decorators.js';
import { APP_STYLES } from './app-styles';
import { TRANSLATIONS } from './i18n-base';
import { DEVELOPMENT_TRANSLATIONS } from './i18n-development';
import { DEVELOPMENT_EXTRA_TRANSLATIONS } from './i18n-development-extra';
import { UI_TRANSLATIONS } from './i18n-ui';
import { UI_EXTRA_TRANSLATIONS } from './i18n-ui-extra';
import { FINAL_TRANSLATIONS } from './i18n-final';
import { POLICY_TRANSLATIONS } from './i18n-policy';
import { CLIENT_POLICY_TRANSLATIONS } from './i18n-client-policy';
import { PERMISSION_TABS_TRANSLATIONS } from './i18n-permission-tabs';

import {
  type AuditEvent,
  type Client,
  type OperatorServicePolicy,
  type DevelopmentCatalog,
  type DevelopmentOperation,
  type DevelopmentPack,
  type DevelopmentReport,
  type DevelopmentResult,
  type Discovery,
  type HealthDetails,
  type Profile,
  type Ready,
  type UiContext,
  type OperatorStatus,
  type View,
} from './models';

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
    uiContext: { state: true },
    healthDetails: { state: true },
    localeOverride: { state: true },
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
  @state() uiContext: UiContext = { locale: 'en', theme: 'auto' };
  @state() healthDetails: HealthDetails = { status: 'unknown', checks: [] };
  @state() localeOverride = localStorage.getItem('gateway-locale') ?? '';
  @state() developmentResults: DevelopmentResult[] = [];
  @state() developmentProgress = { status: 'idle', completed: 0, total: 0 };
  @state() developmentOutput: unknown = null;
  @state() developmentEntity = '';
  @state() developmentStartTime = '';
  @state() selectedCapabilities = new Set<string>(['ha.read.diagnostics']);
  @state() clientProfile: Profile = 'observer';
  @state() permissionTab: 'capabilities' | 'operator-services' = 'capabilities';
  @state() bootState: 'checking' | 'ready' | 'error' = 'checking';
  @state() operatorEnabled = false;
  @state() operatorStatus: OperatorStatus = { operator_enabled: false, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: 'loading' };
  @state() operatorPolicy: OperatorServicePolicy | null = null;
  private operatorPolicySaveQueue: Promise<void> = Promise.resolve();

  static styles = APP_STYLES;

  connectedCallback() { super.connectedCallback(); void this.refresh(); }

  get locale() { return resolveLocale(this.localeOverride, this.uiContext.locale, TRANSLATIONS); }
  t(key: string) {
    return translate(key, this.locale, [TRANSLATIONS, DEVELOPMENT_TRANSLATIONS, DEVELOPMENT_EXTRA_TRANSLATIONS, UI_TRANSLATIONS, UI_EXTRA_TRANSLATIONS, POLICY_TRANSLATIONS, CLIENT_POLICY_TRANSLATIONS, PERMISSION_TABS_TRANSLATIONS, FINAL_TRANSLATIONS], TRANSLATIONS);
  }
  setLocale(locale: string) { this.localeOverride = locale; if (locale) localStorage.setItem('gateway-locale', locale); else localStorage.removeItem('gateway-locale'); }
  get effectiveTheme() { return resolveTheme(this.uiContext.theme, Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches)); }

  async refresh() {
    this.busy = true; this.bootState = 'checking'; this.error = '';
    try { [this.ready, this.clients, this.audit, this.development, this.developmentReports, this.uiContext, this.healthDetails, this.operatorStatus, this.operatorPolicy] = await Promise.all([api<Ready>('/../ready'), api<Client[]>('/clients'), api<AuditEvent[]>('/audit'), api<DevelopmentCatalog>('/development/catalog'), api<DevelopmentReport[]>('/development/reports'), api<UiContext>('/ui/context'), api<HealthDetails>('/health/details'), api<OperatorStatus>('/operator/status'), api<OperatorServicePolicy>('/operator/service-policy')]); this.operatorEnabled = this.operatorStatus.operator_enabled; this.bootState = 'ready'; }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorLoadState'); this.bootState = 'error'; }
    finally { this.busy = false; }
  }

  setView(view: View) { this.view = view; this.error = ''; }

  async createClient(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true; this.error = '';
    try {
      const result = await api<Client & { token: string }>('/clients', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), display_name: data.get('display_name'), profile: data.get('profile'), capabilities: [...this.selectedCapabilities], operator_services: data.getAll('operator_services') }) });
      this.issuedToken = result.token; form.reset(); this.selectedCapabilities = new Set(['ha.read.diagnostics']); this.clientProfile = 'observer'; this.permissionTab = 'capabilities'; await this.refresh();
    } catch (error) { this.error = error instanceof Error ? error.message : this.t('errorIssueClient'); }
    finally { this.busy = false; }
  }

  setClientProfile(profile: Profile) {
    this.clientProfile = profile;
    this.selectedCapabilities = new Set(capabilitiesAfterProfileChange(profile, this.selectedCapabilities));
  }

  toggleCapability(name: string, checked: boolean) {
    this.selectedCapabilities = new Set(applyCapabilityToggle(this.clientProfile, this.selectedCapabilities, name, checked));
  }

  selectObserverCapabilities() {
    this.selectedCapabilities = new Set(capabilitiesForProfile('observer', CAPABILITY_DEFINITIONS));
  }

  clearCapabilities() { this.selectedCapabilities = new Set(); }

  capabilityText(name: string, suffix: 'Label' | 'Description', fallback: string) {
    return resolveCapabilityText(TRANSLATIONS[this.locale], name, suffix, fallback);
  }

  statusText(status: string) { return resolveStatusText(this.t.bind(this), status); }

  operationText(operation: string, field: 'Label' | 'Description', fallback: string) {
    return resolveOperationText(this.t.bind(this), operation, field, fallback);
  }

  packText(pack: string, field: 'Label' | 'Description', fallback: string) {
    return resolvePackText(this.t.bind(this), pack, field, fallback);
  }

  capabilitySelector() {
    const selectAll = this.clientProfile === 'operator' ? () => { this.selectedCapabilities = new Set(capabilitiesForProfile('operator', CAPABILITY_DEFINITIONS)); } : () => this.selectObserverCapabilities();
    return html`<div class="capability-toolbar"><span class="muted">${this.selectedCapabilities.size} ${this.t('selectedCapabilities')}</span><span class="capability-actions"><button type="button" class="secondary" @click=${selectAll}>${this.t('selectAllObserver')}</button><button type="button" class="secondary" @click=${() => this.clearCapabilities()}>${this.t('clearSelection')}</button></span></div><div class="capability-grid">${CAPABILITY_DEFINITIONS.map((item) => html`<label class="capability-option ${item.group === 'operator' ? 'operator' : ''}"><input type="checkbox" value=${item.name} .checked=${this.selectedCapabilities.has(item.name)} ?disabled=${item.group === 'operator' && (!this.operatorEnabled || this.clientProfile !== 'operator')} @change=${(event: Event) => this.toggleCapability(item.name, (event.target as HTMLInputElement).checked)} /><span><strong>${this.capabilityText(item.name, 'Label', item.label)} · <code>${item.name}</code></strong><small>${this.capabilityText(item.name, 'Description', item.description)}</small></span></label>`)}</div>`;
  }

  async revoke(clientId: string) {
    if (!window.confirm(this.t('revokeConfirm').replace('{client}', clientId))) return;
    this.busy = true;
    try { await api<void>(`/clients/${encodeURIComponent(clientId)}/revoke`, { method: 'POST' }); await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorRevokeClient'); }
    finally { this.busy = false; }
  }

  async rotate(clientId: string) {
    if (!window.confirm(this.t('rotateConfirm').replace('{client}', clientId))) return;
    this.busy = true; this.error = '';
    try { const result = await api<Client & { token: string }>(`/clients/${encodeURIComponent(clientId)}/rotate`, { method: 'POST' }); this.issuedToken = result.token; await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorRotateClient'); }
    finally { this.busy = false; }
  }

  async loadDiscovery(event: Event) {
    event.preventDefault(); const form = event.target as HTMLFormElement; const token = String(new FormData(form).get('token') ?? '');
    this.busy = true; this.error = '';
    try { this.discovery = await api<Discovery>('/mcp/discovery', { headers: { Authorization: `Bearer ${token}` } }); }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorDiscovery'); }
    finally { this.busy = false; }
  }

  async loadDevelopmentReports() {
    try { this.developmentReports = await loadDevelopmentReports(); } catch { /* execution result remains visible */ }
  }

  async startDevelopmentJob(operation: string, parameters: Record<string, string>, errorKey: string) {
    this.busy = true; this.error = ''; this.developmentProgress = { status: 'queued', completed: 0, total: 0 };
    try {
      await executeDevelopmentJob(operation, parameters, {
        onSnapshot: (snapshot) => {
          this.developmentProgress = { status: snapshot.status, completed: snapshot.completed, total: snapshot.total };
          this.developmentResults = snapshot.results;
          this.developmentOutput = snapshot.results;
        },
        onFinished: () => this.loadDevelopmentReports(),
      });
    } catch (error) { this.error = error instanceof Error ? error.message : this.t(errorKey); }
    finally { this.busy = false; }
  }

  async runDevelopment(operation: string) {
    const parameters: Record<string, string> = {};
    const definition = this.development?.operations.find((item) => item.name === operation);
    if (definition?.supports_entity_id && this.developmentEntity) parameters.entity_id = this.developmentEntity;
    if (definition?.supports_start_time && this.developmentStartTime) parameters.start_time = this.developmentStartTime;
    await this.startDevelopmentJob(operation, parameters, 'errorProbe');
  }

  async runAllDevelopment() {
    await this.startDevelopmentJob('all', {}, 'errorProbes');
  }

  async runDevelopmentPack(pack: string) {
    await this.startDevelopmentJob(`pack:${pack}`, {}, 'errorPack');
  }

  async copyDiagnostic(result: DevelopmentResult) {
    await copyDiagnosticFile(result);
  }

  async copyProblemReports() {
    await copyProblemReportsFile(this.developmentResults);
  }

  async retryDevelopment(operation: string) {
    await this.runDevelopment(operation);
  }

  downloadDiagnostic() {
    downloadDiagnosticFile(this.healthDetails, this.developmentResults, this.developmentReports);
  }

  loadingView() {
    const failed = this.bootState === 'error';
    return html`<div class="shell ${this.effectiveTheme}">${neuralBackground()}<main class="boot-stage" aria-busy=${failed ? 'false' : 'true'}><section class="boot-card" aria-live="polite"><div class="boot-orbit" aria-hidden="true"><div class="boot-core"></div></div><h1>${failed ? this.t('errorLoadState') : this.t('checkingGateway')}</h1><p>${this.t('healthDescription')}</p>${failed ? html`<div class="alert" role="alert" style="margin-top:20px">${this.error}</div><button class="secondary boot-retry" @click=${() => void this.refresh()}>${this.t('refresh')}</button>` : html`<div class="boot-status"><span class="dot"></span>${this.t('checkingGateway')}</div><div class="boot-progress" role="progressbar" aria-label=${this.t('checkingGateway')}></div>`}</section></main></div>`;
  }

  render() {
    if (this.bootState !== 'ready') return this.loadingView();
    const active = this.view;
    return html`<div class="shell ${this.effectiveTheme}">${neuralBackground()}<div class="layout">
      <aside>
        <div class="brand"><img class="brand-mark" src="/icon.png" alt="" width="34" height="34" /><div><strong>${this.t('gateway')}</strong><small> ${this.t('controlPlane')}</small></div></div>
        ${navigationView(this.view, this.t.bind(this), (view) => this.setView(view))}
        <div class="side-foot"><div class="ok">● ${this.t('observerFirst')}</div><div>${this.t('operatorDisabled')}</div></div>
      </aside>
      <main aria-busy=${this.busy ? 'true' : 'false'}>
        <div class="topline"><div><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>${this.pageTitle()}</h1><p>${this.subtitle()}</p></div><div style="display:grid;gap:10px;justify-items:end"><label class="muted">${this.t('language')}<select aria-label=${this.t('language')} @change=${(event: Event) => this.setLocale((event.target as HTMLSelectElement).value)}><option value="">Home Assistant (${this.uiContext.locale})</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="pt">Português</option><option value="it">Italiano</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ru">Русский</option><option value="hi">हिन्दी</option><option value="ar">العربية</option></select></label><div class="status-pill ${this.ready?.status === 'ready' ? '' : 'warn'}"><span class="dot"></span>${this.ready?.status === 'ready' ? this.t('gatewayReady') : this.t('checkingGateway')}</div></div></div>
        ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : ''}
        ${active === 'overview' ? html`${this.overview()}${this.healthPanel()}${this.topologyPanel()}` : active === 'development' ? this.developmentView() : active === 'clients' ? this.clientsView() : active === 'policy' ? this.policyView() : active === 'mcp' ? this.mcpView() : this.auditView()}
      </main>
    </div>${this.issuedToken ? this.tokenModal() : ''}</div>`;
  }

  nav(view: View, icon: string, label: string) { return html`<button class=${this.view === view ? 'active' : ''} @click=${() => this.setView(view)}><span aria-hidden="true">${icon}</span> ${label}</button>`; }
  pageTitle() { return pageTitle(this.t.bind(this), this.view); }
  subtitle() { return pageSubtitle(this.t.bind(this), this.view); }

  overview() { return overviewView({ ready: this.ready, clients: this.clients, audit: this.audit, healthDetails: this.healthDetails, t: this.t.bind(this), statusText: this.statusText.bind(this), navigate: (view) => this.setView(view) }); }

  healthPanel() { return healthView({ ready: this.ready, clients: this.clients, audit: this.audit, healthDetails: this.healthDetails, t: this.t.bind(this), statusText: this.statusText.bind(this), navigate: (view) => this.setView(view) }); }

  topologyPanel() { return topologyView({ ready: this.ready, clients: this.clients, audit: this.audit, healthDetails: this.healthDetails, t: this.t.bind(this), statusText: this.statusText.bind(this), navigate: (view) => this.setView(view) }); }

  developmentView() { return renderDevelopmentView({ catalog: this.development, progress: this.developmentProgress, results: this.developmentResults, reports: this.developmentReports, output: this.developmentOutput, entity: this.developmentEntity, startTime: this.developmentStartTime, busy: this.busy, t: this.t.bind(this), statusText: this.statusText.bind(this), packText: this.packText.bind(this), operationText: this.operationText.bind(this), setEntity: (value) => { this.developmentEntity = value; }, setStartTime: (value) => { this.developmentStartTime = value; }, runAll: () => void this.runAllDevelopment(), runPack: (name) => void this.runDevelopmentPack(name), runOperation: (name) => void this.runDevelopment(name), download: () => this.downloadDiagnostic(), copyProblemReports: () => void this.copyProblemReports(), copyDiagnostic: (result) => void this.copyDiagnostic(result), retry: (operation) => void this.retryDevelopment(operation), reasonText: (reason) => reason === 'empty_result' ? this.t('statusPartial') : reason }); }

  clientsView() { return renderClientsView({ clients: this.clients, busy: this.busy, t: this.t.bind(this), refresh: () => void this.refresh(), createClient: this.createClient.bind(this), revoke: (clientId) => void this.revoke(clientId), rotate: (clientId) => void this.rotate(clientId), capabilitySelector: () => this.capabilitySelector(), operatorEnabled: this.operatorEnabled, operatorServices: selectedOperatorServices(this.operatorPolicy), navigateToPolicy: () => this.setView('policy'), permissionTab: this.permissionTab, setPermissionTab: (tab) => { this.permissionTab = tab; }, profile: this.clientProfile, setProfile: (profile) => this.setClientProfile(profile) }); }

  auditView() { return auditView({ audit: this.audit, t: this.t.bind(this), loadAudit: (decision) => void this.loadAudit(decision) }); }

  async loadAudit(decision: string) { this.busy = true; try { this.audit = await api<AuditEvent[]>(`/audit?limit=100${decision ? `&decision=${encodeURIComponent(decision)}` : ''}`); } catch (error) { this.error = error instanceof Error ? error.message : this.t('errorAudit'); } finally { this.busy = false; } }
  private queueOperatorPolicySave() {
    this.operatorPolicySaveQueue = this.operatorPolicySaveQueue.then(async () => {
      if (!this.operatorPolicy) return;
      this.busy = true; this.error = '';
      try { await api('/operator/service-policy', { method: 'PUT', body: JSON.stringify({ selected: this.operatorPolicy.selected }) }); }
      catch (error) { this.error = error instanceof Error && error.message === 'operator_service_policy_invalid' ? this.t('operatorServicesPolicyInvalid') : error instanceof Error ? error.message : this.t('operatorServicesPolicyInvalid'); }
      finally { this.busy = false; }
    });
  }
  toggleOperatorService(service: string, checked: boolean) {
    if (!this.operatorPolicy) return;
    this.operatorPolicy = { ...this.operatorPolicy, selected: toggleOperatorServiceSelection(this.operatorPolicy.selected, service, checked) };
    this.queueOperatorPolicySave();
  }
  toggleOperatorServiceGroup(services: string[], checked: boolean) {
    if (!this.operatorPolicy) return;
    this.operatorPolicy = { ...this.operatorPolicy, selected: toggleOperatorServiceGroupSelection(this.operatorPolicy.selected, services, checked) };
    this.queueOperatorPolicySave();
  }

  policyView() { return renderPolicyView({ clients: this.clients, busy: this.busy, t: this.t.bind(this), evaluatePolicy: this.evaluatePolicy.bind(this), operatorPolicy: this.operatorPolicy, toggleOperatorService: this.toggleOperatorService.bind(this), toggleOperatorServiceGroup: this.toggleOperatorServiceGroup.bind(this) }); }
  async evaluatePolicy(event: Event) { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); this.busy = true; try { const result = await api<{ decision: string; reason: string }>('/policy/evaluate', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), capability: data.get('capability'), mutation: data.has('mutation') }) }); window.alert(`${result.decision}: ${result.reason}`); } catch (error) { this.error = error instanceof Error ? error.message : this.t('errorPolicy'); } finally { this.busy = false; } }
  mcpView() { return renderMcpView({ ready: this.ready, discovery: this.discovery, busy: this.busy, t: this.t.bind(this), loadDiscovery: this.loadDiscovery.bind(this) }); }
  tokenModal() { return html`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><div class="eyebrow">${this.t('oneTimeCredential')}</div><h2>${this.t('tokenOnce')}</h2><p>${this.t('tokenOnlyOnce')}</p><div class="token mono">${this.issuedToken}</div><div class="form-actions"><button class="secondary" @click=${() => navigator.clipboard?.writeText(this.issuedToken)}>${this.t('copyToken')}</button><button class="primary" @click=${() => { this.issuedToken = ''; }}>${this.t('savedIt')}</button></div></div></div>`; }
}

customElements.define('gateway-app', GatewayApp);
