import { html, type TemplateResult } from 'lit';
import { gatewayStatus, type GatewayStatus } from './ui-primitives';

export function gatewayMetricCard(
  label: string | TemplateResult,
  value: string | TemplateResult,
  description: string | TemplateResult,
  status: GatewayStatus = '',
): TemplateResult {
  return html`<section class="card metric-card" aria-label=${typeof label === 'string' ? label : ''}>
    <span class="card-label">${label}</span>
    <strong class=${['metric', status].filter(Boolean).join(' ')}>${value}</strong>
    <p>${description}</p>
  </section>`;
}

export function gatewayToolbar(
  title: string | TemplateResult,
  description: string | TemplateResult,
  actions: TemplateResult = html``,
): TemplateResult {
  return html`<div class="toolbar"><div><h2>${title}</h2><p>${description}</p></div><div class="toolbar-actions">${actions}</div></div>`;
}

export function gatewayResultRow(
  primary: string | TemplateResult,
  secondary: string | TemplateResult,
  status?: { label: string | TemplateResult; tone: GatewayStatus },
  actions: TemplateResult = html``,
): TemplateResult {
  return html`<div class="result-row"><div><strong>${primary}</strong><br /><span class="muted">${secondary}</span>${status ? html` <span class=${status.tone}>${status.label}</span>` : ''}</div><div class="result-actions">${actions}</div></div>`;
}

export function gatewayTagList(tags: readonly (string | TemplateResult)[]): TemplateResult {
  return html`<div class="tag-list" role="list">${tags.map((tag) => html`<span class="tag" role="listitem">${tag}</span>`)}</div>`;
}

export function gatewayFormActions(content: TemplateResult): TemplateResult {
  return html`<div class="form-actions">${content}</div>`;
}

export function gatewayStack(content: TemplateResult, className = ''): TemplateResult {
  return html`<div class=${['ui-stack', className].filter(Boolean).join(' ')}>${content}</div>`;
}

export { gatewayStatus };
