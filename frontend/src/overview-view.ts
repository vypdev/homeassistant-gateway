import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayCard, gatewayColumns, gatewayMetricCard, gatewayResultRow, gatewayStatus, gatewayTagList, gatewayToolbar } from './ui';
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
  return html`
    ${gatewayColumns(html`
      ${gatewayMetricCard(ctx.t('storage'), ctx.statusText(ctx.ready?.storage ?? 'unknown'), ctx.t('privateState'), 'ok')}
      ${gatewayMetricCard(ctx.t('homeAssistant'), ctx.statusText(ctx.ready?.home_assistant ?? 'unknown'), ctx.t('supervisorUpstream'), ctx.ready?.home_assistant === 'ready' ? 'ok' : 'warn')}
      ${gatewayMetricCard(ctx.t('activeClients'), String(active), ctx.t('bearerIdentities'))}
      ${gatewayMetricCard(ctx.t('auditEvents'), String(ctx.audit.length), ctx.t('sanitizedRecords'))}
    `, 4, 'cards')}
    <div class="split">
      ${gatewayCard(html`<h2>${ctx.t('systemPosture')}</h2><p>${ctx.t('postureDescription')}</p>${gatewayTagList([ctx.t('ingressTrusted'), ctx.t('tokenDigests'), ctx.t('readOnlyMcp')])}`, 'wide')}
      ${gatewayCard(html`<h2>${ctx.t('quickActions')}</h2><div class="form-actions overview-actions">${gatewayButton({ label: ctx.t('manageClients'), variant: 'primary', onClick: () => ctx.navigate('clients') })}${gatewayButton({ label: ctx.t('viewAudit'), variant: 'secondary', onClick: () => ctx.navigate('audit') })}</div>`, 'wide')}
    </div>
  `;
}

export function healthView(ctx: OverviewViewContext): TemplateResult {
  const tone = ctx.healthDetails.status === 'ready' ? 'ok' : ctx.healthDetails.status === 'degraded' ? 'warn' : 'bad';
  return html`
    <section class="card overview-health">
      ${gatewayToolbar(ctx.t('upstreamHealth'), ctx.t('healthDescription'), gatewayStatus(ctx.statusText(ctx.healthDetails.status), tone))}
      <div class="result-list">
        ${ctx.healthDetails.checks.map((check) => gatewayResultRow(html`<span><strong>${check.name}</strong> <span class=${check.status === 'ok' ? 'ok' : 'bad'}>${ctx.statusText(check.status)}</span></span>`, html`<span class="mono">${check.latency_ms} ms · ${check.http_status ?? 'transport'}${check.code ? ` · ${check.code}` : ''}</span>`))}
      </div>
    </section>
  `;
}

export function topologyView(ctx: OverviewViewContext): TemplateResult {
  const status = (name: string) => ctx.healthDetails.checks.find((check) => check.name === name)?.status ?? 'unknown';
  const node = (label: string, value: string) => html`<div class="card topology-card"><div class="topology-node"><strong>${label}</strong>${gatewayStatus(ctx.statusText(value), value === 'ok' || value === 'ready' ? 'ok' : value === 'unknown' ? '' : 'warn', 'inline-chip')}</div></div>`;
  return html`<section class="card overview-topology">${gatewayToolbar(ctx.t('systemTopology'), ctx.t('topologyDescription'), html`<span class="mono">${ctx.t('topologyIngress')} → ${ctx.t('topologyGateway')} → ${ctx.t('topologyUpstream')}</span>`)}<div class="topology-grid"><div class="card topology-card"><div class="topology-node"><strong>${ctx.t('topologyIngress')}</strong>${gatewayStatus(ctx.t('trusted'), 'ok', 'inline-chip')}</div></div>${node(ctx.t('topologyGateway'), ctx.ready?.status ?? 'unknown')}${node(ctx.t('topologyCore'), status('core'))}${node(ctx.t('topologyRecorder'), status('recorder'))}${node(ctx.t('topologyLogbook'), status('logbook'))}</div></section>`;
}
