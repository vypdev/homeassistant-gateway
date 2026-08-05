import { html, type TemplateResult } from 'lit';

export type GatewayButtonVariant = 'primary' | 'secondary' | 'danger' | 'link';
export type GatewayStatus = 'ok' | 'warn' | 'bad' | '';

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

/**
 * Presentation-only button primitive. Application/controller code supplies state and callbacks;
 * this helper owns the shared HA-like interaction contract and accessible busy state.
 */
export function gatewayButton(options: GatewayButtonOptions): TemplateResult {
  const variant = options.variant ?? 'secondary';
  const className = [(variant === 'link' ? 'link-button' : variant), options.className].filter(Boolean).join(' ');
  const disabled = Boolean(options.disabled || options.loading);
  const icon = options.loading
    ? html`<span class="button-spinner" aria-hidden="true"></span>`
    : options.leadingIcon
      ? html`<span class="button-leading-icon" aria-hidden="true">${options.leadingIcon}</span>`
      : '';

  return html`<button
    class=${className}
    type=${options.type ?? 'button'}
    ?disabled=${disabled}
    aria-busy=${options.loading ? 'true' : 'false'}
    aria-label=${options.ariaLabel}
    @click=${options.onClick}
  >${icon}${options.label}</button>`;
}

/** Shared outlined text/password field with Home Assistant-compatible label semantics. */
export function gatewayTextField(options: FieldBase & { type?: 'text' | 'password' | 'search' }): TemplateResult {
  return html`<label class="gateway-field">${options.label}<input
    type=${options.type ?? 'text'}
    name=${options.name}
    .value=${options.value ?? ''}
    placeholder=${options.placeholder}
    maxlength=${options.maxLength}
    ?required=${options.required}
    ?disabled=${options.disabled}
    @input=${options.onInput}
  /></label>`;
}

/** Shared select field; option markup stays with the owning view because options are domain data. */
export function gatewaySelect(options: FieldBase & { options: TemplateResult }): TemplateResult {
  return html`<label class="gateway-field">${options.label}<select
    name=${options.name}
    ?required=${options.required}
    ?disabled=${options.disabled}
    @change=${options.onInput}
  >${options.options}</select></label>`;
}

/** Wraps a view section in the shared Home Assistant-like card surface. */
export function gatewayCard(content: TemplateResult, className = ''): TemplateResult {
  return html`<section class=${['card', className].filter(Boolean).join(' ')}>${content}</section>`;
}

export function gatewaySection(title: string | TemplateResult, content: TemplateResult, description?: string | TemplateResult): TemplateResult {
  return html`<section class="card gateway-section"><header class="gateway-section-header"><div><h2>${title}</h2>${description ? html`<p>${description}</p>` : ''}</div></header>${content}</section>`;
}

export function gatewayStatus(label: string | TemplateResult, status: GatewayStatus = '', className = ''): TemplateResult {
  return html`<span class=${['tag', status, className].filter(Boolean).join(' ')} role="status">${label}</span>`;
}

export function gatewayAlert(content: string | TemplateResult, tone: 'error' | 'warning' | 'info' = 'error'): TemplateResult {
  return html`<div class=${['alert', `alert-${tone}`].join(' ')} role="alert">${content}</div>`;
}

export function gatewayEmptyState(content: string | TemplateResult): TemplateResult {
  return html`<div class="empty gateway-empty-state" role="status">${content}</div>`;
}

export function gatewayDialog(title: string | TemplateResult, content: TemplateResult, actions: TemplateResult): TemplateResult {
  return html`<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="gateway-dialog-title"><div class="eyebrow">Home Assistant App</div><h2 id="gateway-dialog-title">${title}</h2>${content}<div class="form-actions">${actions}</div></section></div>`;
}
