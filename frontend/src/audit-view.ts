import { html, type TemplateResult } from 'lit';
import type { AuditEvent } from './models';

type Translator = (key: string) => string;
type LoadAudit = (decision: string) => void;

export type AuditViewContext = {
  audit: AuditEvent[];
  t: Translator;
  loadAudit: LoadAudit;
};

export function auditView(ctx: AuditViewContext): TemplateResult {
  return html`<div class="card"><div class="toolbar"><div><h2>${ctx.t('auditEvents')}</h2><p>${ctx.t('auditNotStored')}</p></div><div><select @change=${(event: Event) => ctx.loadAudit((event.target as HTMLSelectElement).value)}><option value="">${ctx.t('allDecisions')}</option><option value="allowed">${ctx.t('allowed')}</option><option value="denied">${ctx.t('denied')}</option><option value="approval_required">${ctx.t('approvalRequiredOption')}</option></select></div></div>${ctx.audit.length ? html`<div class="table-wrap"><table><thead><tr><th>${ctx.t('time')}</th><th>${ctx.t('action')}</th><th>${ctx.t('target')}</th><th>${ctx.t('decision')}</th><th>${ctx.t('outcome')}</th><th>${ctx.t('requestId')}</th></tr></thead><tbody>${ctx.audit.map((event) => html`<tr><td class="mono">${new Date(event.occurred_at).toLocaleString()}</td><td>${event.action}</td><td class="mono">${event.target}</td><td class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</td><td>${event.outcome} · ${event.status_code}</td><td class="mono">${event.request_id}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">${ctx.t('noAudit')}</div>`}</div>`;
}
