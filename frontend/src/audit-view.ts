import { html, type TemplateResult } from 'lit';
import { gatewayCard, gatewayEmptyState, gatewaySelect, gatewayTable, gatewayToolbar } from './ui';
import type { AuditEvent } from './models';

type Translator = (key: string) => string;
type LoadAudit = (decision: string) => void;

export type AuditViewContext = {
  audit: AuditEvent[];
  t: Translator;
  loadAudit: LoadAudit;
};

export function auditView(ctx: AuditViewContext): TemplateResult {
  const filter = gatewaySelect({ id: 'audit-decision-filter', label: ctx.t('decision'), name: 'audit-decision-filter', onInput: (event) => ctx.loadAudit((event.target as HTMLSelectElement).value), options: html`<option value="">${ctx.t('allDecisions')}</option><option value="allowed">${ctx.t('allowed')}</option><option value="denied">${ctx.t('denied')}</option><option value="approval_required">${ctx.t('approvalRequiredOption')}</option>` });
  return gatewayCard(html`${gatewayToolbar(ctx.t('auditEvents'), ctx.t('auditNotStored'), filter)}${ctx.audit.length ? html`
    <div class="table-wrap desktop-only">${gatewayTable([ctx.t('time'), ctx.t('action'), ctx.t('target'), ctx.t('decision'), ctx.t('outcome'), ctx.t('requestId')], ctx.audit.map((event) => [
      html`<span class="mono">${new Date(event.occurred_at).toLocaleString()}</span>`,
      event.action,
      html`<span class="mono">${event.target}</span>`,
      html`<span class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</span>`,
      `${event.outcome} · ${event.status_code}`,
      html`<span class="mono">${event.request_id}</span>`,
    ]))}</div>
    <div class="responsive-records" data-testid="audit-responsive-records">${ctx.audit.map((event) => html`<article class="responsive-record" data-testid="audit-record">
      <div class="responsive-record-header"><strong>${event.action}</strong><span class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</span></div>
      <div class="responsive-field"><span>${ctx.t('time')}</span><time class="mono" datetime=${event.occurred_at}>${new Date(event.occurred_at).toLocaleString()}</time></div>
      <div class="responsive-field responsive-field-stack"><span>${ctx.t('target')}</span><code class="responsive-wrap">${event.target}</code></div>
      <div class="responsive-field"><span>${ctx.t('outcome')}</span><span>${event.outcome} · ${event.status_code}</span></div>
      <div class="responsive-field responsive-field-stack"><span>${ctx.t('requestId')}</span><code class="responsive-wrap">${event.request_id}</code></div>
    </article>`)}</div>` : gatewayEmptyState(ctx.t('noAudit'))}`);
}
