import { html, type TemplateResult } from 'lit';

export type GatewayButtonVariant = 'primary' | 'secondary' | 'danger' | 'link';
export type GatewayStatus = 'ok' | 'warn' | 'bad' | '';

export type GatewayButtonOptions = {
  label: string | TemplateResult;
  variant?: GatewayButtonVariant;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: string | TemplateResult;
  className?: string;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
};

type FieldBase = {
  label: string | TemplateResult;
  name?: string;
  value?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  onInput?: (event: Event) => void;
};

export type GatewayTab = {
  id: string;
  label: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function gatewayIcon(path: string, className = 'gateway-icon', label?: string): TemplateResult {
  return html`<svg class=${className} viewBox="0 0 24 24" aria-hidden=${label ? 'false' : 'true'} focusable="false" role=${label ? 'img' : 'presentation'}>${label ? html`<title>${label}</title>` : ''}<path d=${path}></path></svg>`;
}

export function gatewayButton(options: GatewayButtonOptions): TemplateResult {
  const variant = options.variant ?? 'secondary';
  const className = [(variant === 'link' ? 'link-button' : variant), options.className].filter(Boolean).join(' ');
  const disabled = Boolean(options.disabled || options.loading);
  const icon = options.loading
    ? html`<span class="button-spinner" aria-hidden="true"></span>`
    : options.leadingIcon
      ? html`<span class="button-leading-icon" aria-hidden="true">${options.leadingIcon}</span>`
      : '';
  return html`<button class=${className} type=${options.type ?? 'button'} ?disabled=${disabled} aria-busy=${options.loading ? 'true' : 'false'} aria-label=${options.ariaLabel} @click=${options.onClick}>${icon}${options.label}</button>`;
}

export function gatewayIconButton(path: string, label: string, onClick: (event: Event) => void, disabled = false): TemplateResult {
  return html`<button class="icon-button" type="button" aria-label=${label} title=${label} ?disabled=${disabled} @click=${onClick}>${gatewayIcon(path)}</button>`;
}

export function gatewayTabGroup(tabs: GatewayTab[], ariaLabel: string, className = ''): TemplateResult {
  return html`<div class=${['ui-tab-group', className].filter(Boolean).join(' ')} role="tablist" aria-label=${ariaLabel}>${tabs.map((tab) => gatewayTab(tab))}</div>`;
}

export function gatewayTab(tab: GatewayTab): TemplateResult {
  return html`<button class="ui-tab" type="button" role="tab" aria-selected=${tab.selected ?? false} ?disabled=${tab.disabled} aria-label=${tab.label} title=${tab.label} @click=${tab.onSelect}>${tab.icon ? gatewayIcon(tab.icon, 'ui-tab-icon') : ''}<span>${tab.label}</span></button>`;
}

export function gatewayTextField(options: FieldBase & { type?: 'text' | 'password' | 'search'; error?: string; help?: string }): TemplateResult {
  return html`<label class="gateway-field">${options.label}<input type=${options.type ?? 'text'} name=${options.name} .value=${options.value ?? ''} placeholder=${options.placeholder} maxlength=${options.maxLength} ?required=${options.required} ?disabled=${options.disabled} aria-invalid=${options.error ? 'true' : 'false'} @input=${options.onInput} />${options.help ? html`<small class="field-help">${options.help}</small>` : ''}${options.error ? html`<small class="field-error" role="alert">${options.error}</small>` : ''}</label>`;
}

export function gatewaySelect(options: FieldBase & { options: TemplateResult }): TemplateResult {
  return html`<label class="gateway-field">${options.label}<select name=${options.name} ?required=${options.required} ?disabled=${options.disabled} @change=${options.onInput}>${options.options}</select></label>`;
}

export function gatewayCard(content: TemplateResult, className = ''): TemplateResult {
  return html`<section class=${['card', 'ui-card', className].filter(Boolean).join(' ')}>${content}</section>`;
}

export function gatewaySection(title: string | TemplateResult, content: TemplateResult, description?: string | TemplateResult): TemplateResult {
  return html`<section class="card ui-card gateway-section"><header class="gateway-section-header"><div><h2>${title}</h2>${description ? html`<p>${description}</p>` : ''}</div></header>${content}</section>`;
}

export function gatewayStatus(label: string | TemplateResult, status: GatewayStatus = '', className = ''): TemplateResult {
  return html`<span class=${['tag', 'ui-chip', status, className].filter(Boolean).join(' ')} role="status">${label}</span>`;
}

export function gatewayAlert(content: string | TemplateResult, tone: 'error' | 'warning' | 'info' = 'error'): TemplateResult {
  return html`<div class=${['alert', `alert-${tone}`, 'ui-alert'].join(' ')} role="alert">${content}</div>`;
}

export function gatewayEmptyState(content: string | TemplateResult): TemplateResult {
  return html`<div class="empty ui-empty-state gateway-empty-state" role="status">${content}</div>`;
}

export function gatewayLoadingState(label: string | TemplateResult): TemplateResult {
  return html`<div class="ui-loading-state" role="status" aria-live="polite" aria-busy="true"><span class="button-spinner" aria-hidden="true"></span><span>${label}</span></div>`;
}

export function gatewayDialog(title: string | TemplateResult, content: TemplateResult, actions: TemplateResult): TemplateResult {
  return html`<div class="modal-backdrop" role="presentation"><section class="modal ui-dialog" role="dialog" aria-modal="true" aria-labelledby="gateway-dialog-title"><h2 id="gateway-dialog-title">${title}</h2>${content}<div class="form-actions">${actions}</div></section></div>`;
}
