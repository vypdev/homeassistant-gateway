import { html, type TemplateResult } from 'lit';
import type { DevelopmentCatalog, DevelopmentPack, DevelopmentResult, DevelopmentReport } from './models';
import { isProblemStatus } from './view-helpers';

type Translator = (key: string) => string;
type StatusText = (status: string) => string;

type DevelopmentProgress = { total: number; completed: number; status: string };

export type DevelopmentViewContext = {
  catalog: DevelopmentCatalog | null;
  progress: DevelopmentProgress;
  results: DevelopmentResult[];
  reports: DevelopmentReport[];
  output: unknown;
  entity: string;
  startTime: string;
  busy: boolean;
  t: Translator;
  statusText: StatusText;
  packText: (name: string, field: 'Label' | 'Description', fallback: string) => string;
  operationText: (name: string, field: 'Label' | 'Description', fallback: string) => string;
  setEntity: (value: string) => void;
  setStartTime: (value: string) => void;
  runAll: () => void;
  runPack: (name: string) => void;
  runOperation: (name: string) => void;
  download: () => void;
  copyProblemReports: () => void;
  copyDiagnostic: (result: DevelopmentResult) => void;
  retry: (operation: string) => void;
  reasonText: (reason: string) => string;
};
export function developmentView(ctx: DevelopmentViewContext): TemplateResult {
  const catalog = ctx.catalog;
  return html`<div class="dev-grid">
    <div class="card">
      <div class="toolbar"><div><h2>${ctx.t('observerProbes')}</h2><p>${ctx.t('internalSurface')}</p></div><button class="primary" @click=${() => ctx.runAll()} ?disabled=${ctx.busy || !catalog?.enabled}>${ctx.t('runAll')}</button></div>
      <div class="pack-grid">${catalog?.packs.map((pack: DevelopmentPack) => html`<button class="secondary" @click=${() => ctx.runPack(pack.name)} ?disabled=${ctx.busy || !catalog.enabled}><strong>${ctx.packText(pack.name, 'Label', pack.label)}</strong><small>${ctx.packText(pack.name, 'Description', pack.description)}</small></button>`)}</div>
      <p>${ctx.t('devUpstreamStatus')}: <span class=${catalog?.upstream === 'ready' ? 'ok' : 'warn'}>${ctx.statusText(catalog?.upstream ?? 'loading')}</span>.</p>
      <div class="form" style="margin-top:16px">
        <label>${ctx.t('entityFilter')}<input .value=${ctx.entity} @input=${(event: Event) => ctx.setEntity((event.target as HTMLInputElement).value)} placeholder=${ctx.t('devEntityPlaceholder')} /></label>
        <label>${ctx.t('startTime')}<input .value=${ctx.startTime} @input=${(event: Event) => ctx.setStartTime((event.target as HTMLInputElement).value)} placeholder=${ctx.t('devStartTimePlaceholder')} /></label>
      </div>
      <div class="result-list">${catalog?.operations.map((operation) => html`<div class="result-row"><div><strong>${ctx.operationText(operation.name, 'Label', operation.label)}</strong><br><span class="muted">${ctx.operationText(operation.name, 'Description', operation.description)}</span></div><button class="secondary" @click=${() => ctx.runOperation(operation.name)} ?disabled=${ctx.busy || !catalog.enabled}>${ctx.t('run')}</button></div>`)}</div>
    </div>
    <div class="card">
      <div class="toolbar"><div><h2>${ctx.t('executionEvidence')}</h2><p>${ctx.t('countLatency')}</p></div><div>${ctx.progress.total ? html`<span class="tag ${ctx.progress.status === 'error' ? 'bad' : ctx.progress.status === 'warning' ? 'warn' : ''}" aria-live="polite">${ctx.progress.completed}/${ctx.progress.total}</span>` : ''}${ctx.results.length ? html`<span class="tag">${ctx.results.length} ${ctx.t('result')}</span>` : ''}${ctx.results.filter((result) => isProblemStatus(result.status)).length ? html`<span class="tag warn">${ctx.results.filter((result) => isProblemStatus(result.status)).length} ${ctx.t('problemReports')}</span>` : ''}<button class="secondary" @click=${() => ctx.copyProblemReports()} ?disabled=${!ctx.results.some((result) => isProblemStatus(result.status))}>${ctx.t('copyProblemReports')}</button><button class="secondary" @click=${() => ctx.download()}>${ctx.t('exportDiagnostic')}</button></div></div>
      ${ctx.results.length ? html`<div class="result-list">${ctx.results.map((result: DevelopmentResult) => html`<div class="result-row ${result.reason === 'empty_result' ? 'empty-result' : ''}"><span><strong>${ctx.operationText(result.operation, 'Label', result.operation)}</strong> <span class=${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'bad'}>${ctx.statusText(result.status)}</span>${result.reason ? html`<br><span class="muted">${ctx.reasonText(result.reason)}</span>` : ''}${result.trace?.length ? html`<details class="trace-details"><summary>${ctx.t('traceability')} (${result.trace.length})</summary><div class="trace-list">${result.trace.map((step) => html`<div class="trace-step"><span>${ctx.t('tracePhase')}: <code>${step.phase}</code> · ${ctx.t('traceTransport')}: <code>${step.transport}</code> · ${ctx.t('traceStatus')}: <code>${step.status}</code></span><span class="mono">${step.duration_ms} ${ctx.t('devMilliseconds')}${step.attempt && step.attempt > 1 ? ` · ${ctx.t('traceAttempts')}: ${step.attempt}` : ''}</span>${step.command ? html`<small>${ctx.t('traceCommand')}: <code>${step.command}</code></small>` : ''}${step.path ? html`<small>${ctx.t('tracePath')}: <code>${step.path}</code></small>` : ''}${step.code ? html`<small>${ctx.t('technicalDetails')}: <code>${step.code}</code></small>` : ''}</div>`)}</div>${result.details ? html`<pre class="dev-output">${JSON.stringify(result.details, null, 2)}</pre>` : ''}</details>` : ''}</span><span class="mono">${result.count} ${ctx.t('devItems')} · ${result.duration_ms} ${ctx.t('devMilliseconds')} ${result.status !== 'ok' ? html`<button class="secondary" @click=${() => ctx.copyDiagnostic(result)}>${ctx.t('copyDiagnostic')}</button><button class="secondary" @click=${() => ctx.retry(result.operation)}>${ctx.t('retry')}</button>` : ''}</span></div>`)}</div><pre class="dev-output">${JSON.stringify(ctx.output, null, 2)}</pre>` : html`<div class="empty" role="status" aria-live="polite">${ctx.t('exactResponse')}</div>`}
      ${ctx.reports.length ? html`<h3 style="margin-top:18px">${ctx.t('historicalEvidenceLabel')}</h3><div class="result-list">${ctx.reports.map((report) => html`<div class="result-row"><span><strong>${ctx.operationText(report.operation, 'Label', report.operation)}</strong> <span class=${report.status === 'ok' ? 'ok' : 'warn'}>${ctx.statusText(report.status)}</span><br><span class="muted">${new Date(report.occurred_at).toLocaleString()} · ${report.schema_fingerprint.slice(0, 12)}</span></span><span class="mono">${report.total_count} ${ctx.t('devItems')}${report.comparison ? ` · Δ ${report.comparison.count_delta}` : ''}${report.comparison?.schema_changed ? ` · ${ctx.t('devSchemaChanged')}` : ''}${report.comparison_details?.regressions?.length ? ` · ⚠ ${report.comparison_details.regressions.length} ${ctx.t('devRegressions')}` : ''}</span></div>`)}</div>` : ''}
      <div class="card blocked" style="margin-top:14px"><h3>${ctx.t('mutationProbes')}</h3><p><span class="warn">${ctx.t('mutationsBlocked')}</span></p><div style="margin-top:10px"><span class="tag">${ctx.t('approvalRequired')}</span><span class="tag">${ctx.t('operatorDisabledTag')}</span><span class="tag">${ctx.t('noMcpMutation')}</span></div></div>
    </div>
  </div>`;
}
