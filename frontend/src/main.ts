import { LitElement, html } from 'lit';
import { downloadDiagnostic as downloadDiagnosticFile, copyDiagnostic as copyDiagnosticFile, copyProblemReports as copyProblemReportsFile } from './diagnostics-service';
import { createGatewayAppDependencies } from './composition-root';
import type { GatewayController } from './gateway-controller';
import { BootstrapError, GatewayError } from './gateway-errors';
import { CAPABILITY_DEFINITIONS } from './capabilities';
import { capabilitiesAfterProfileChange, capabilitiesForProfile, toggleCapability as applyCapabilityToggle } from './capability-policy';
import { selectedOperatorServices as getSelectedOperatorServices, toggleOperatorServiceGroupSelection, toggleOperatorServiceSelection } from './operator-policy';
import { resolveLocale, resolveTheme, translate } from './locale';
import { capabilityText as resolveCapabilityText, operationText as resolveOperationText, packText as resolvePackText, pageSubtitle, pageTitle, statusText as resolveStatusText } from './view-helpers';
import { navigationView } from './navigation-view';
import { catalogView } from './catalog-view';
import { overviewView, healthView, topologyView } from './overview-view';
import { auditView } from './audit-view';
import { clientsView as renderClientsView } from './clients-view';
import { developmentView as renderDevelopmentView } from './development-view';
import { policyView as renderPolicyView } from './policy-view';
import { mcpView as renderMcpView } from './mcp-view';
import { loadDevelopmentReports, executeDevelopmentJob } from './development-controller';
import { property, state } from 'lit/decorators.js';
import { APP_STYLES } from './app-styles';
import { gatewayAlert, gatewayButton, gatewayCheckboxGroup, gatewayDialog } from './ui';
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
  type BootstrapCheck,
  type CapabilityProbeReport,
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
  };

  @property({ type: String }) view: View = 'overview';
  @state() ready: Ready | null = null;
  @state() clients: Client[] = [];
  @state() busy = false;
  @state() clientsBusy = false;
  @state() auditBusy = false;
  @state() discoveryBusy = false;
  @state() policyBusy = false;
  @state() developmentBusy = false;
  @state() error = '';
  @state() issuedToken = '';
  @state() discovery: Discovery | null = null;
  @state() audit: AuditEvent[] = [];
  @state() development: DevelopmentCatalog | null = null;
  @state() developmentReports: DevelopmentReport[] = [];
  @state() uiContext: UiContext = { locale: 'en', theme: 'auto' };
  @state() healthDetails: HealthDetails = { status: 'unknown', checks: [] };
  @state() developmentResults: DevelopmentResult[] = [];
  @state() developmentProgress = { status: 'idle', completed: 0, total: 0 };
  @state() developmentOutput: unknown = null;
  @state() developmentEntity = '';
  @state() developmentStartTime = '';
  @state() selectedCapabilities = new Set<string>(['ha.read.diagnostics']);
  @state() selectedOperatorServices = new Set<string>();
  @state() clientProfile: Profile = 'observer';
  @state() permissionTab: 'capabilities' | 'operator-services' = 'capabilities';
  @state() editingClientId: string | null = null;
  @state() editingCapabilities = new Set<string>();
  @state() editingClientProfile: Profile = 'observer';
  @state() bootState: 'checking' | 'ready' | 'error' = 'checking';
  @state() bootChecks: BootstrapCheck[] = [];
  @state() operatorEnabled = false;
  @state() operatorStatus: OperatorStatus = { operator_enabled: false, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: 'loading' };
  @state() operatorPolicy: OperatorServicePolicy | null = null;
  @state() capabilityProbe: CapabilityProbeReport | null = null;
  @state() capabilityProbeBusy = false;
  private readonly gatewayController: GatewayController;
  private refreshVersion = 0;
  private policySaveVersion = 0;
  private refreshController: AbortController | null = null;
  private mutationController: AbortController | null = null;
  private mutationVersion = 0;

  static styles = APP_STYLES;

  constructor(gatewayController: GatewayController = createGatewayAppDependencies().gatewayController) {
    super();
    this.gatewayController = gatewayController;
  }

  connectedCallback() { super.connectedCallback(); void this.refresh(); }

  get locale() { return resolveLocale('', this.uiContext.locale, TRANSLATIONS); }
  t(key: string) {
    return translate(key, this.locale, [TRANSLATIONS, DEVELOPMENT_TRANSLATIONS, DEVELOPMENT_EXTRA_TRANSLATIONS, UI_TRANSLATIONS, UI_EXTRA_TRANSLATIONS, POLICY_TRANSLATIONS, CLIENT_POLICY_TRANSLATIONS, PERMISSION_TABS_TRANSLATIONS, FINAL_TRANSLATIONS], TRANSLATIONS);
  }

  get effectiveTheme() { return resolveTheme(this.uiContext.theme, Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches)); }

  private errorMessage(error: unknown, fallbackKey: string): string {
    if (error instanceof BootstrapError) {
      const failed = error.checks.filter((check) => check.status === 'failed');
      const summary = failed.map((check) => `${check.path} — ${check.error?.http_status ? `HTTP ${check.error.http_status} · ` : ''}${check.error?.code ?? 'unknown_error'}`).join('; ');
      return `${this.t('errorLoadState')}: ${summary}`;
    }
    if (error instanceof GatewayError) {
      if (error.code === 'server_error' && error.status) return `Request failed (${error.status})`;
      const keyByCode: Record<string, string> = {
        operator_service_policy_invalid: 'operatorServicesPolicyInvalid',
        unauthorized: fallbackKey,
        forbidden: fallbackKey,
        not_found: fallbackKey,
        validation_error: fallbackKey,
        network_error: fallbackKey,
        invalid_response: 'errorLoadState',
        server_error: fallbackKey,
        unknown_error: fallbackKey,
      };
      return this.t(keyByCode[error.code] ?? fallbackKey);
    }
    return this.t(fallbackKey);
  }

  private applyBootstrap(snapshot: Awaited<ReturnType<GatewayController['refresh']>>) {
    this.ready = snapshot.ready;
    this.clients = snapshot.clients;
    this.audit = snapshot.audit;
    this.development = snapshot.development;
    this.developmentReports = snapshot.developmentReports;
    this.uiContext = snapshot.uiContext;
    this.healthDetails = snapshot.healthDetails;
    this.operatorStatus = snapshot.operatorStatus;
    this.operatorPolicy = snapshot.operatorPolicy;
    this.operatorEnabled = this.operatorStatus.operator_enabled;
  }

  async refresh() {
    const version = ++this.refreshVersion;
    this.refreshController?.abort();
    const controller = new AbortController();
    this.refreshController = controller;
    this.busy = true; this.bootState = 'checking'; this.error = ''; this.bootChecks = [];
    try {
      const snapshot = await this.gatewayController.refresh(controller.signal, (check) => {
        if (version !== this.refreshVersion) return;
        this.bootChecks = this.bootChecks.some((current) => current.id === check.id)
          ? this.bootChecks.map((current) => current.id === check.id ? check : current)
          : [...this.bootChecks, check];
      });
      if (version !== this.refreshVersion) return;
      this.applyBootstrap(snapshot); this.bootState = 'ready';
    }
    catch (error) {
      if (version !== this.refreshVersion || controller.signal.aborted) return;
      if (error instanceof BootstrapError) this.bootChecks = error.checks;
      this.error = this.errorMessage(error, 'errorLoadState'); this.bootState = 'error';
    }
    finally {
      if (this.refreshController === controller) this.refreshController = null;
      if (version === this.refreshVersion) this.busy = false;
    }
  }

  private invalidateRefresh() {
    this.refreshVersion++;
    this.refreshController?.abort();
    this.refreshController = null;
  }

  private beginMutation() {
    this.mutationController?.abort();
    const controller = new AbortController();
    this.mutationController = controller;
    const version = ++this.mutationVersion;
    this.invalidateRefresh();
    return { controller, version };
  }

  private isCurrentMutation(version: number, controller: AbortController) {
    return version === this.mutationVersion && this.mutationController === controller && !controller.signal.aborted;
  }

  private finishMutation(version: number, controller: AbortController) {
    if (version !== this.mutationVersion || this.mutationController !== controller) return;
    this.mutationController = null;
  }

  private syncClientsInBackground(version: number) {
    void this.gatewayController.refreshClients()
      .then((clients) => { if (version === this.mutationVersion) this.clients = clients; })
      .catch(() => { /* the mutation result remains visible; manual refresh can retry */ });
  }

  setView(view: View) { this.view = view; this.error = ''; }

  async createClient(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const mutation = this.beginMutation();
    this.clientsBusy = true; this.error = '';
    try {
      const result = await this.gatewayController.createClient({ client_id: String(data.get('client_id') ?? ''), display_name: String(data.get('display_name') ?? ''), profile: String(data.get('profile') ?? 'observer'), capabilities: [...this.selectedCapabilities], operator_services: [...this.selectedOperatorServices] }, mutation.controller.signal);
      if (!this.isCurrentMutation(mutation.version, mutation.controller)) return;
      const { token, ...client } = result.client;
      this.clients = [...this.clients, client];
      this.issuedToken = token; form.reset(); this.selectedCapabilities = new Set(['ha.read.diagnostics']); this.selectedOperatorServices = new Set(); this.clientProfile = 'observer'; this.permissionTab = 'capabilities';
      this.syncClientsInBackground(mutation.version);
    } catch (error) {
      if (this.isCurrentMutation(mutation.version, mutation.controller)) this.error = this.errorMessage(error, 'errorIssueClient');
    } finally { if (this.isCurrentMutation(mutation.version, mutation.controller)) this.clientsBusy = false; this.finishMutation(mutation.version, mutation.controller); }
  }

  setClientProfile(profile: Profile) {
    this.clientProfile = profile;
    this.selectedCapabilities = new Set(capabilitiesAfterProfileChange(profile, this.selectedCapabilities));
    if (profile !== 'operator') this.selectedOperatorServices = new Set();
  }

  setOperatorServiceSelection(services: readonly string[]) {
    this.selectedOperatorServices = new Set(services);
  }

  toggleCapability(name: string, checked: boolean, implemented = true) {
    this.selectedCapabilities = new Set(applyCapabilityToggle(this.clientProfile, this.selectedCapabilities, name, checked, implemented));
  }

  selectObserverCapabilities() {
    this.selectedCapabilities = new Set(capabilitiesForProfile('observer', CAPABILITY_DEFINITIONS));
  }

  clearCapabilities() { this.selectedCapabilities = new Set(); }

  editClientCapabilities(clientId: string) {
    const client = this.clients.find((item) => item.client_id === clientId);
    if (!client || client.status !== 'active') return;
    this.editingClientId = clientId;
    this.editingClientProfile = client.profile;
    this.editingCapabilities = new Set(client.capabilities);
  }

  cancelCapabilityEdit() {
    this.editingClientId = null;
    this.editingCapabilities = new Set();
    this.editingClientProfile = 'observer';
  }

  async saveClientCapabilities() {
    if (!this.editingClientId) return;
    const mutation = this.beginMutation();
    this.clientsBusy = true; this.error = '';
    try {
      const client = await this.gatewayController.updateClientCapabilities(this.editingClientId, [...this.editingCapabilities], mutation.controller.signal);
      if (!this.isCurrentMutation(mutation.version, mutation.controller)) return;
      this.clients = this.clients.map((item) => item.client_id === client.client_id ? client : item);
      this.cancelCapabilityEdit();
    } catch (error) {
      if (this.isCurrentMutation(mutation.version, mutation.controller)) this.error = this.errorMessage(error, 'errorIssueClient');
    } finally { if (this.isCurrentMutation(mutation.version, mutation.controller)) this.clientsBusy = false; this.finishMutation(mutation.version, mutation.controller); }
  }

  async probeCapabilities(clientId: string) {
    this.capabilityProbeBusy = true;
    this.error = '';
    try {
      this.capabilityProbe = await this.gatewayController.probeCapabilities(clientId);
    } catch (error) {
      this.error = this.errorMessage(error, 'errorLoadState');
    } finally {
      this.capabilityProbeBusy = false;
    }
  }

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

  capabilitySelector(editing = false) {
    const selected = () => editing ? this.editingCapabilities : this.selectedCapabilities;
    const profile = () => editing ? this.editingClientProfile : this.clientProfile;
    const update = (next: Iterable<string>) => {
      if (editing) this.editingCapabilities = new Set(next); else this.selectedCapabilities = new Set(next);
    };
    return gatewayCheckboxGroup({
      selectedCount: selected().size,
      selectedLabel: this.t('selectedCapabilities'),
      selectAllLabel: this.t('selectAllObserver'),
      clearLabel: this.t('clearSelection'),
      onSelectAll: () => update(capabilitiesForProfile(profile(), CAPABILITY_DEFINITIONS)),
      onClear: () => update([]),
      items: CAPABILITY_DEFINITIONS.map((item) => ({
        value: item.name,
        label: this.capabilityText(item.name, 'Label', item.label),
        description: `${this.capabilityText(item.name, 'Description', item.description)}${item.implemented === false ? ' · Not implemented' : ''}`,
        checked: selected().has(item.name),
        disabled: item.implemented === false || (item.group === 'operator' && (!this.operatorEnabled || profile() !== 'operator')),
        className: item.group === 'operator' ? 'operator' : '',
        onChange: (event: Event) => update(applyCapabilityToggle(profile(), selected(), item.name, (event.target as HTMLInputElement).checked, item.implemented !== false)),
      })),
    });
  }

  async revoke(clientId: string) {
    if (!window.confirm(this.t('revokeConfirm').replace('{client}', clientId))) return;
    const mutation = this.beginMutation();
    this.clientsBusy = true; this.error = '';
    try {
      await this.gatewayController.revokeClient(clientId, mutation.controller.signal);
      if (this.isCurrentMutation(mutation.version, mutation.controller)) {
        this.clients = this.clients.map((client) => client.client_id === clientId ? { ...client, status: 'revoked', revoked_at: new Date().toISOString() } : client);
        this.syncClientsInBackground(mutation.version);
      }
    } catch (error) {
      if (this.isCurrentMutation(mutation.version, mutation.controller)) this.error = this.errorMessage(error, 'errorRevokeClient');
    } finally { if (this.isCurrentMutation(mutation.version, mutation.controller)) this.clientsBusy = false; this.finishMutation(mutation.version, mutation.controller); }
  }

  async deleteClient(clientId: string) {
    if (!window.confirm(this.t('deleteConfirm').replace('{client}', clientId))) return;
    const mutation = this.beginMutation();
    this.clientsBusy = true; this.error = '';
    try {
      await this.gatewayController.deleteClient(clientId, mutation.controller.signal);
      if (this.isCurrentMutation(mutation.version, mutation.controller)) {
        this.clients = this.clients.filter((client) => client.client_id !== clientId);
        this.syncClientsInBackground(mutation.version);
      }
    } catch (error) {
      if (this.isCurrentMutation(mutation.version, mutation.controller)) this.error = this.errorMessage(error, 'errorDeleteClient');
    } finally { if (this.isCurrentMutation(mutation.version, mutation.controller)) this.clientsBusy = false; this.finishMutation(mutation.version, mutation.controller); }
  }

  async rotate(clientId: string) {
    if (!window.confirm(this.t('rotateConfirm').replace('{client}', clientId))) return;
    const mutation = this.beginMutation();
    this.clientsBusy = true; this.error = '';
    try {
      const result = await this.gatewayController.rotateClient(clientId, mutation.controller.signal);
      if (!this.isCurrentMutation(mutation.version, mutation.controller)) return;
      const { token, ...client } = result.client;
      this.clients = this.clients.map((item) => item.client_id === clientId ? client : item);
      this.issuedToken = token;
      this.syncClientsInBackground(mutation.version);
    } catch (error) {
      if (this.isCurrentMutation(mutation.version, mutation.controller)) this.error = this.errorMessage(error, 'errorRotateClient');
    } finally { if (this.isCurrentMutation(mutation.version, mutation.controller)) this.clientsBusy = false; this.finishMutation(mutation.version, mutation.controller); }
  }

  async loadDiscovery(event: Event) {
    event.preventDefault(); const form = event.target as HTMLFormElement; const token = String(new FormData(form).get('token') ?? '');
    this.discoveryBusy = true; this.error = '';
    try { this.discovery = await this.gatewayController.loadDiscovery(token); }
    catch (error) { this.error = this.errorMessage(error, 'errorDiscovery'); }
    finally { this.discoveryBusy = false; }
  }

  async loadDevelopmentReports() {
    try { this.developmentReports = await loadDevelopmentReports(); } catch { /* execution result remains visible */ }
  }

  async startDevelopmentJob(operation: string, parameters: Record<string, string>, errorKey: string) {
    this.developmentBusy = true; this.error = ''; this.developmentProgress = { status: 'queued', completed: 0, total: 0 };
    try {
      await executeDevelopmentJob(operation, parameters, {
        onSnapshot: (snapshot) => {
          this.developmentProgress = { status: snapshot.status, completed: snapshot.completed, total: snapshot.total };
          this.developmentResults = snapshot.results;
          this.developmentOutput = snapshot.results;
        },
        onFinished: () => this.loadDevelopmentReports(),
      });
    } catch (error) { this.error = this.errorMessage(error, errorKey); }
    finally { this.developmentBusy = false; }
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

  private bootstrapCheckLabel(id: BootstrapCheck['id']) {
    const labels: Record<BootstrapCheck['id'], string> = {
      readiness: 'bootCheckReadiness', clients: 'bootCheckClients', audit: 'bootCheckAudit', catalog: 'bootCheckCatalog', development_reports: 'bootCheckReports', ui_context: 'bootCheckUiContext', health_details: 'bootCheckHealth', operator_status: 'bootCheckOperatorStatus', operator_policy: 'bootCheckOperatorPolicy',
    };
    return this.t(labels[id]);
  }

  private bootstrapCheckStatus(check: BootstrapCheck) {
    if (check.status === 'ok') return this.t('bootCheckDone');
    if (check.status === 'running') return this.t('bootCheckRunning');
    if (check.status === 'failed') return this.t('bootCheckFailed');
    return this.t('bootCheckPending');
  }

  private bootstrapChecksView() {
    return html`<ul class="boot-checks" aria-label=${this.t('bootChecks')}>
      ${this.bootChecks.map((check) => html`<li class="boot-check boot-check-${check.status}">
        <span class="boot-check-icon" aria-hidden="true">${check.status === 'ok' ? '✓' : check.status === 'failed' ? '!' : check.status === 'running' ? '…' : '·'}</span>
        <span class="boot-check-copy"><strong>${this.bootstrapCheckLabel(check.id)}</strong><small>${check.path}</small>${check.error ? html`<span class="boot-check-error">${check.error.http_status ? `HTTP ${check.error.http_status} · ` : ''}${check.error.code}</span>` : ''}</span>
        <span class="boot-check-status">${this.bootstrapCheckStatus(check)}${check.duration_ms !== null ? ` · ${check.duration_ms} ms` : ''}</span>
      </li>`)}
    </ul>`;
  }

  loadingView() {
    const failed = this.bootState === 'error';
    const completed = this.bootChecks.filter((check) => check.status === 'ok' || check.status === 'failed').length;
    const total = this.bootChecks.length;
    return html`<div class="shell ${this.effectiveTheme}"><main class="boot-stage" aria-busy=${failed ? 'false' : 'true'}><section class="boot-card" aria-live="polite"><div class="boot-orbit" aria-hidden="true"><div class="boot-core"></div></div><h1>${failed ? this.t('errorLoadState') : this.t('checkingGateway')}</h1><p>${failed ? this.t('bootFailureDescription') : this.t('healthDescription')}</p>${total ? html`<p class="boot-summary">${completed}/${total} ${this.t('bootChecksCompleted')}</p>${this.bootstrapChecksView()}` : ''}${failed ? html`${gatewayAlert(this.error)}${gatewayButton({ label: this.t('refresh'), variant: 'secondary', className: 'boot-retry', onClick: () => void this.refresh() })}` : html`<div class="boot-status"><span class="dot"></span>${this.t('checkingGateway')}</div><div class="boot-progress" role="progressbar" aria-label=${this.t('checkingGateway')}></div>`}</section></main></div>`;
  }

  private get anyBusy() { return this.busy || this.clientsBusy || this.auditBusy || this.discoveryBusy || this.policyBusy || this.developmentBusy; }

  render() {
    if (this.bootState !== 'ready') return this.loadingView();
    const active = this.view;
    return html`<div class="shell ${this.effectiveTheme}">
      ${navigationView(this.view, this.t.bind(this), (view) => this.setView(view))}
      <main class="layout" aria-busy=${this.anyBusy ? 'true' : 'false'}>
        <div class="content-status"><div class="status-pill ${this.ready?.status === 'ready' ? '' : 'warn'}"><span class="dot"></span>${this.ready?.status === 'ready' ? this.t('gatewayReady') : this.t('checkingGateway')}</div></div>
        <div class="topline"><div><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>${this.pageTitle()}</h1><p>${this.subtitle()}</p></div></div>
        ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : ''}
        ${active === 'overview' ? html`${this.overview()}${this.healthPanel()}${this.topologyPanel()}` : active === 'development' ? this.developmentView() : active === 'clients' ? this.clientsView() : active === 'policy' ? this.policyView() : active === 'mcp' ? this.mcpView() : active === 'catalog' ? catalogView() : this.auditView()}
      </main>
      ${this.issuedToken ? this.tokenModal() : ''}
    </div>`;
  }

  nav(view: View, icon: string, label: string) { return html`<button class=${this.view === view ? 'active' : ''} @click=${() => this.setView(view)}><span aria-hidden="true">${icon}</span> ${label}</button>`; }
  pageTitle() { return pageTitle(this.t.bind(this), this.view); }
  subtitle() { return pageSubtitle(this.t.bind(this), this.view); }

  overview() { return overviewView({ ready: this.ready, clients: this.clients, audit: this.audit, healthDetails: this.healthDetails, t: this.t.bind(this), statusText: this.statusText.bind(this), navigate: (view) => this.setView(view) }); }

  healthPanel() { return healthView({ ready: this.ready, clients: this.clients, audit: this.audit, healthDetails: this.healthDetails, t: this.t.bind(this), statusText: this.statusText.bind(this), navigate: (view) => this.setView(view) }); }

  topologyPanel() { return topologyView({ ready: this.ready, clients: this.clients, audit: this.audit, healthDetails: this.healthDetails, t: this.t.bind(this), statusText: this.statusText.bind(this), navigate: (view) => this.setView(view) }); }

  developmentView() { return renderDevelopmentView({ catalog: this.development, progress: this.developmentProgress, results: this.developmentResults, reports: this.developmentReports, output: this.developmentOutput, entity: this.developmentEntity, startTime: this.developmentStartTime, busy: this.developmentBusy, t: this.t.bind(this), statusText: this.statusText.bind(this), packText: this.packText.bind(this), operationText: this.operationText.bind(this), setEntity: (value) => { this.developmentEntity = value; }, setStartTime: (value) => { this.developmentStartTime = value; }, runAll: () => void this.runAllDevelopment(), runPack: (name) => void this.runDevelopmentPack(name), runOperation: (name) => void this.runDevelopment(name), download: () => this.downloadDiagnostic(), copyProblemReports: () => void this.copyProblemReports(), copyDiagnostic: (result) => void this.copyDiagnostic(result), retry: (operation) => void this.retryDevelopment(operation), reasonText: (reason) => reason === 'empty_result' ? this.t('statusPartial') : reason }); }

  async refreshClients() {
    this.clientsBusy = true;
    try { this.clients = await this.gatewayController.refreshClients(); }
    catch (error) { this.error = this.errorMessage(error, 'errorLoadState'); }
    finally { this.clientsBusy = false; }
  }

  clientsView() { return renderClientsView({ clients: this.clients, busy: this.clientsBusy, t: this.t.bind(this), refresh: () => void this.refreshClients(), createClient: this.createClient.bind(this), revoke: (clientId) => void this.revoke(clientId), deleteClient: (clientId) => void this.deleteClient(clientId), rotate: (clientId) => void this.rotate(clientId), editCapabilities: (clientId) => this.editClientCapabilities(clientId), saveCapabilities: () => void this.saveClientCapabilities(), cancelCapabilityEdit: () => this.cancelCapabilityEdit(), editingClientId: this.editingClientId, probe: (clientId) => void this.probeCapabilities(clientId), probeReport: this.capabilityProbe, probeBusy: this.capabilityProbeBusy, capabilitySelector: () => this.capabilitySelector(), editCapabilitySelector: () => this.capabilitySelector(true), operatorEnabled: this.operatorEnabled, operatorServices: getSelectedOperatorServices(this.operatorPolicy), selectedOperatorServices: [...this.selectedOperatorServices], setOperatorServiceSelection: (services) => this.setOperatorServiceSelection(services), navigateToPolicy: () => this.setView('policy'), permissionTab: this.permissionTab, setPermissionTab: (tab) => { this.permissionTab = tab; }, profile: this.clientProfile, setProfile: (profile) => this.setClientProfile(profile) }); }

  auditView() { return auditView({ audit: this.audit, t: this.t.bind(this), loadAudit: (decision) => void this.loadAudit(decision) }); }

  async loadAudit(decision: string) { this.auditBusy = true; try { this.audit = await this.gatewayController.loadAudit(decision); } catch (error) { this.error = this.errorMessage(error, 'errorAudit'); } finally { this.auditBusy = false; } }
  private queueOperatorPolicySave() {
    if (!this.operatorPolicy) return;
    const saveVersion = ++this.policySaveVersion;
    this.policyBusy = true; this.error = '';
    void this.gatewayController.saveOperatorPolicy(this.operatorPolicy.selected)
      .catch((error) => { if (saveVersion === this.policySaveVersion) this.error = this.errorMessage(error, 'operatorServicesPolicyInvalid'); })
      .finally(() => { if (saveVersion === this.policySaveVersion) this.policyBusy = false; });
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

  policyView() { return renderPolicyView({ clients: this.clients, busy: this.policyBusy, t: this.t.bind(this), evaluatePolicy: this.evaluatePolicy.bind(this), operatorPolicy: this.operatorPolicy, toggleOperatorService: this.toggleOperatorService.bind(this), toggleOperatorServiceGroup: this.toggleOperatorServiceGroup.bind(this) }); }
  async evaluatePolicy(event: Event) { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); this.policyBusy = true; try { const result = await this.gatewayController.evaluatePolicy({ client_id: String(data.get('client_id') ?? ''), capability: String(data.get('capability') ?? ''), mutation: data.has('mutation') }); window.alert(`${result.decision}: ${result.reason}`); } catch (error) { this.error = this.errorMessage(error, 'errorPolicy'); } finally { this.policyBusy = false; } }
  mcpView() { return renderMcpView({ ready: this.ready, discovery: this.discovery, busy: this.discoveryBusy, t: this.t.bind(this), loadDiscovery: this.loadDiscovery.bind(this) }); }
  tokenModal() {
    return gatewayDialog(
      this.t('tokenOnce'),
      html`<p>${this.t('tokenOnlyOnce')}</p><div class="token mono">${this.issuedToken}</div>`,
      html`${gatewayButton({ label: this.t('copyToken'), variant: 'secondary', onClick: () => void navigator.clipboard?.writeText(this.issuedToken) })}${gatewayButton({ label: this.t('savedIt'), variant: 'primary', onClick: () => { this.issuedToken = ''; } })}`,
      { dialogId: 'token-dialog' },
    );
  }
}

customElements.define('gateway-app', GatewayApp);
