import { html, type TemplateResult } from 'lit';
import { gatewayIcon, gatewayStatus, type GatewayStatus } from './ui-primitives';

export type GatewaySettingsItem = {
  title: string;
  description: string;
  iconPath: string;
  iconTone: string;
  href?: string;
  onClick?: (event: Event) => void;
};

export function gatewaySettingsMenu(
  groups: readonly (readonly GatewaySettingsItem[])[],
): TemplateResult {
  return html`<div class="ha-settings-menu">
    ${groups.map((group, index) => html`
      ${index > 0 ? html`<hr class="ha-settings-divider" />` : ''}
      <section class="ha-settings-group" aria-label=${`Settings group ${index + 1}`}>
        ${group.map((item) => html`
          <a class="ha-settings-item" href=${item.href ?? '#'} @click=${item.onClick}>
            <span class=${['ha-settings-icon', item.iconTone].join(' ')}>${gatewayIcon(item.iconPath)}</span>
            <span class="ha-settings-copy"><strong>${item.title}</strong><span>${item.description}</span></span>
            <span class="ha-settings-chevron" aria-hidden="true">›</span>
          </a>
        `)}
      </section>
    `)}
  </div>`;
}

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

export function gatewayHeading(title: string | TemplateResult, description?: string | TemplateResult): TemplateResult {
  return html`<header class="ha-heading"><h2>${title}</h2>${description ? html`<p>${description}</p>` : ''}</header>`;
}

export function gatewayRow(content: TemplateResult, className = ''): TemplateResult {
  return html`<div class=${['ha-row', className].filter(Boolean).join(' ')}>${content}</div>`;
}

export function gatewayColumns(content: TemplateResult, columns = 2, className = ''): TemplateResult {
  return html`<div class=${['ha-columns', className].filter(Boolean).join(' ')} style=${`--ha-columns: ${columns}`}>${content}</div>`;
}

export function gatewayLabel(text: string | TemplateResult, forId?: string): TemplateResult {
  return html`<label class="ha-label" for=${forId ?? ''}>${text}</label>`;
}

export function gatewayBadge(label: string | TemplateResult, tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral'): TemplateResult {
  return html`<span class=${['ha-badge', `ha-badge-${tone}`].join(' ')}>${label}</span>`;
}

export function gatewayTable(headers: readonly string[], rows: readonly (readonly (string | TemplateResult)[])[]): TemplateResult {
  return html`<div class="ha-table-wrap"><table class="ha-table"><thead><tr>${headers.map((header) => html`<th scope="col">${header}</th>`)}</tr></thead><tbody>${rows.map((row) => html`<tr>${row.map((cell) => html`<td>${cell}</td>`)}</tr>`)}</tbody></table></div>`;
}

export function gatewayStack(content: TemplateResult, className = ''): TemplateResult {
  return html`<div class=${['ui-stack', className].filter(Boolean).join(' ')}>${content}</div>`;
}

export { gatewayStatus };
