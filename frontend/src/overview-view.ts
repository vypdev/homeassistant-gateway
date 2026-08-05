import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayStatus } from './ui';
import type { AuditEvent, Client, HealthDetails, Ready } from './models';

type Translator = (key: string) => string;
type StatusText = (status: string) => string;
type Navigate = (view: 'clients' | 'audit') => void;

export type OverviewViewContext = {
  ready: Ready | null;
  clients: Client[];
  audit: AuditEvent[];
  healthDetails: HealthDetails;
  t: Translator;
  statusText: StatusText;
  navigate: Navigate;
};

export function overviewView(ctx: OverviewViewContext): TemplateResult {
  const active = ctx.clients.filter((client) => client.status === 'active').length;
  return html`<section class="cards"><div class="card"><span class="card-label">${ctx.t('storage')}</span><strong class="metric ok">${ctx.statusText(ctx.ready?.storage ?? 'unknown')}</strong><p>${ctx.t('privateState')}</p></div><div class="card"><span class="card-label">${ctx.t('homeAssistant')}</span><strong class="metric ${ctx.ready?.home_assistant === 'ready' ? 'ok' : 'warn'}">${ctx.statusText(ctx.ready?.home_assistant ?? 'unknown')}</strong><p>${ctx.t('supervisorUpstream')}</p></div><div class="card"><span class="card-label">${ctx.t('activeClients')}</span><strong class="metric">${active}</strong><p>${ctx.t('bearerIdentities')}</p></div><div class="card"><span class="card-label">${ctx.t('auditEvents')}</span><strong class="metric">${ctx.audit.length}</strong><p>${ctx.t('sanitizedRecords')}</p></div></section><div class="split"><div class="card wide"><h2>${ctx.t('systemPosture')}</h2><p>${ctx.t('postureDescription')}</p><div class="topology-tags"><span class="tag">${ctx.t('ingressTrusted')}</span><span class="tag">${ctx.t('tokenDigests')}</span><span class="tag">${ctx.t('readOnlyMcp')}</span></div></div><div class="card wide"><h2>${ctx.t('quickActions')}</h2><div class="form-actions overview-actions">${gatewayButton({ label: ctx.t('manageClients'), variant: 'primary', onClick: () => ctx.navigate('clients') })}${gatewayButton({ label: ctx.t('viewAudit'), variant: 'secondary', onClick: () => ctx.navigate('audit') })}</div></div></div>`;
}

export function healthView(ctx: OverviewViewContext): TemplateResult {
  return html`<section class="card overview-health"><div class="toolbar"><div><h2>${ctx.t('upstreamHealth')}</h2><p>${ctx.t('healthDescription')}</p></div>${gatewayStatus(ctx.statusText(ctx.healthDetails.status), ctx.healthDetails.status === 'ready' ? 'ok' : ctx.healthDetails.status === 'degraded' ? 'warn' : 'bad')}</div><div class="result-list">${ctx.healthDetails.checks.map((check) => html`<div class="result-row"><span><strong>${check.name}</strong> <span class=${check.status === 'ok' ? 'ok' : 'bad'}>${ctx.statusText(check.status)}</span></span><span class="mono">${check.latency_ms} ms · ${check.http_status ?? 'transport'}${check.code ? ` · ${check.code}` : ''}</span></div>`)}</div></section>`;
}

export function topologyView(ctx: OverviewViewContext): TemplateResult {
  const status = (name: string) => ctx.healthDetails.checks.find((check) => check.name === name)?.status ?? 'unknown';
  const node = (label: string, value: string) => html`<div class="card topology-card"><div class="topology-node"><strong>${label}</strong>${gatewayStatus(ctx.statusText(value), value === 'ok' || value === 'ready' ? 'ok' : value === 'unknown' ? '' : 'warn', 'inline-chip')}</div></div>`;
  return html`<section class="card overview-topology"><div class="toolbar"><div><h2>${ctx.t('systemTopology')}</h2><p>${ctx.t('topologyDescription')}</p></div><span class="mono">${ctx.t('topologyIngress')} → ${ctx.t('topologyGateway')} → ${ctx.t('topologyUpstream')}</span></div><div class="topology-grid"><div class="card topology-card"><div class="topology-node"><strong>${ctx.t('topologyIngress')}</strong>${gatewayStatus(ctx.t('trusted'), 'ok', 'inline-chip')}</div></div>${node(ctx.t('topologyGateway'), ctx.ready?.status ?? 'unknown')}${node(ctx.t('topologyCore'), status('core'))}${node(ctx.t('topologyRecorder'), status('recorder'))}${node(ctx.t('topologyLogbook'), status('logbook'))}</div></section>`;
}
