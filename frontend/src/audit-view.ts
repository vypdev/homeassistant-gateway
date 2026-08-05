import { html, type TemplateResult } from 'lit';
import { gatewayEmptyState, gatewaySelect } from './ui';
import type { AuditEvent } from './models';

type Translator = (key: string) => string;
type LoadAudit = (decision: string) => void;

export type AuditViewContext = {
  audit: AuditEvent[];
  t: Translator;
  loadAudit: LoadAudit;
};

export function auditView(ctx: AuditViewContext): TemplateResult {
  return html`<div class="card"><div class="toolbar"><div><h2>${ctx.t('auditEvents')}</h2><p>${ctx.t('auditNotStored')}</p></div><div>${gatewaySelect({ label: ctx.t('decision'), name: 'audit-decision-filter', onInput: (event) => ctx.loadAudit((event.target as HTMLSelectElement).value), options: html`<option value="">${ctx.t('allDecisions')}</option><option value="allowed">${ctx.t('allowed')}</option><option value="denied">${ctx.t('denied')}</option><option value="approval_required">${ctx.t('approvalRequiredOption')}</option>` })}</div></div>${ctx.audit.length ? html`
    <div class="table-wrap desktop-only"><table><thead><tr><th>${ctx.t('time')}</th><th>${ctx.t('action')}</th><th>${ctx.t('target')}</th><th>${ctx.t('decision')}</th><th>${ctx.t('outcome')}</th><th>${ctx.t('requestId')}</th></tr></thead><tbody>${ctx.audit.map((event) => html`<tr><td class="mono">${new Date(event.occurred_at).toLocaleString()}</td><td>${event.action}</td><td class="mono">${event.target}</td><td class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</td><td>${event.outcome} · ${event.status_code}</td><td class="mono">${event.request_id}</td></tr>`)}</tbody></table></div>
    <div class="responsive-records" data-testid="audit-responsive-records">${ctx.audit.map((event) => html`<article class="responsive-record" data-testid="audit-record">
      <div class="responsive-record-header"><strong>${event.action}</strong><span class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</span></div>
      <div class="responsive-field"><span>${ctx.t('time')}</span><time class="mono" datetime=${event.occurred_at}>${new Date(event.occurred_at).toLocaleString()}</time></div>
      <div class="responsive-field responsive-field-stack"><span>${ctx.t('target')}</span><code class="responsive-wrap">${event.target}</code></div>
      <div class="responsive-field"><span>${ctx.t('outcome')}</span><span>${event.outcome} · ${event.status_code}</span></div>
      <div class="responsive-field responsive-field-stack"><span>${ctx.t('requestId')}</span><code class="responsive-wrap">${event.request_id}</code></div>
    </article>`)}</div>` : gatewayEmptyState(ctx.t('noAudit'))}</div>`;
}
