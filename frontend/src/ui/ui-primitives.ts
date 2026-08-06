import { html, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export type GatewayButtonVariant = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary' | 'link';
export type GatewayButtonAppearance = 'accent' | 'filled' | 'outlined' | 'plain';
export type GatewayButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type GatewayStatus = 'ok' | 'warn' | 'bad' | '';

export type GatewayButtonOptions = {
  label: string | TemplateResult;
  variant?: GatewayButtonVariant;
  appearance?: GatewayButtonAppearance;
  size?: GatewayButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: string | TemplateResult;
  className?: string;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
};

type FieldBase = {
  id?: string;
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
  panelId?: string;
  iconOnly?: boolean;
  iconClassName?: string;
  className?: string;
  onSelect: () => void;
};

export function gatewayIcon(path: string, className = 'gateway-icon', label?: string): TemplateResult {
  return html`<svg class=${className} viewBox="0 0 24 24" aria-hidden=${label ? 'false' : 'true'} focusable="false" role=${label ? 'img' : 'presentation'}>${label ? html`<title>${label}</title>` : ''}<path d=${path}></path></svg>`;
}

export function gatewayButton(options: GatewayButtonOptions): TemplateResult {
  const variant = options.variant ?? 'neutral';
  const haVariant = variant === 'primary' ? 'brand' : variant === 'secondary' ? 'neutral' : variant === 'link' ? 'neutral' : variant;
  const appearance = options.appearance ?? (variant === 'link' ? 'plain' : variant === 'secondary' ? 'outlined' : 'accent');
  const className = ['ha-button', `ha-button-${haVariant}`, `ha-button-${appearance}`, options.size ? `ha-button-${options.size}` : '', variant === 'link' ? 'link-button' : variant, options.className].filter(Boolean).join(' ');
  const disabled = Boolean(options.disabled || options.loading);
  const icon = options.loading
    ? html`<span class="button-spinner" aria-hidden="true"></span>`
    : options.leadingIcon
      ? html`<span class="button-leading-icon" aria-hidden="true">${options.leadingIcon}</span>`
      : '';
  return html`<button class=${className} type=${options.type ?? 'button'} ?disabled=${disabled} aria-busy=${options.loading ? 'true' : 'false'} aria-label=${ifDefined(options.ariaLabel)} @click=${options.onClick}>${icon}${options.label}</button>`;
}

export function gatewayIconButton(path: string, label: string, onClick: (event: Event) => void, disabled = false): TemplateResult {
  return html`<button class="icon-button" type="button" aria-label=${label} title=${label} ?disabled=${disabled} @click=${onClick}>${gatewayIcon(path)}</button>`;
}

export function gatewayTabGroup(tabs: GatewayTab[], ariaLabel: string, className = ''): TemplateResult {
  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.selected));
  const handleKeydown = (event: KeyboardEvent, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab && !nextTab.disabled) nextTab.onSelect();
  };
  return html`<div class=${['ui-tab-group', className].filter(Boolean).join(' ')} role="tablist" aria-label=${ariaLabel}>${tabs.map((tab, index) => gatewayTab(tab, index === selectedIndex ? 0 : -1, (event) => handleKeydown(event, index)))}</div>`;
}

export function gatewayTab(tab: GatewayTab, tabIndex = tab.selected ? 0 : -1, onKeydown?: (event: KeyboardEvent) => void): TemplateResult {
  return html`<button id=${tab.id} class=${['ui-tab', tab.className, tab.iconOnly ? 'ui-tab-icon-only' : ''].filter(Boolean).join(' ')} type="button" role="tab" tabindex=${tabIndex} aria-selected=${tab.selected ?? false} aria-controls=${ifDefined(tab.panelId)} ?disabled=${tab.disabled} aria-label=${tab.label} title=${tab.label} @keydown=${onKeydown} @click=${tab.onSelect}>${tab.icon ? gatewayIcon(tab.icon, tab.iconClassName ?? 'ui-tab-icon') : ''}<span class=${tab.iconOnly ? 'sr-only' : ''}>${tab.label}</span></button>`;
}

function fieldIds(options: FieldBase, suffix: string): string {
  const base = options.id ?? options.name ?? 'gateway-field';
  return `${base}-${suffix}`;
}

export function gatewayTextField(options: FieldBase & { type?: 'text' | 'password' | 'search'; error?: string; help?: string }): TemplateResult {
  const id = options.id ?? options.name ?? 'gateway-field';
  const helpId = options.help ? fieldIds(options, 'help') : undefined;
  const errorId = options.error ? fieldIds(options, 'error') : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  return html`<div class="gateway-field"><label for=${id}>${options.label}</label><input id=${id} type=${options.type ?? 'text'} name=${ifDefined(options.name)} .value=${options.value ?? ''} placeholder=${ifDefined(options.placeholder)} maxlength=${ifDefined(options.maxLength)} ?required=${options.required} ?disabled=${options.disabled} aria-invalid=${options.error ? 'true' : 'false'} aria-describedby=${ifDefined(describedBy)} aria-errormessage=${ifDefined(errorId)} @input=${options.onInput} />${options.help ? html`<small id=${helpId} class="field-help">${options.help}</small>` : ''}${options.error ? html`<small id=${errorId} class="field-error" role="alert">${options.error}</small>` : ''}</div>`;
}

export function gatewayCheckbox(options: { label: string | TemplateResult; name?: string; value?: string; checked?: boolean; disabled?: boolean; className?: string; onChange?: (event: Event) => void }): TemplateResult {
  return html`<label class=${['ha-check-control', options.className].filter(Boolean).join(' ')}><input type="checkbox" name=${ifDefined(options.name)} value=${ifDefined(options.value)} ?checked=${options.checked} ?disabled=${options.disabled} @change=${options.onChange} /><span>${options.label}</span></label>`;
}

export function gatewaySelect(options: FieldBase & { options: TemplateResult; help?: string; error?: string; appearance?: 'standard' | 'ha-reference'; className?: string }): TemplateResult {
  const id = options.id ?? options.name ?? 'gateway-select';
  const helpId = options.help ? fieldIds(options, 'help') : undefined;
  const errorId = options.error ? fieldIds(options, 'error') : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const reference = options.appearance === 'ha-reference';
  return html`<div class=${['gateway-field', reference ? 'gateway-field-reference' : '', options.className].filter(Boolean).join(' ')}>${reference ? html`<label class="sr-only" for=${id}>${options.label}</label>` : html`<label for=${id}>${options.label}</label>`}<select class=${reference ? 'gateway-select-reference' : ''} id=${id} name=${ifDefined(options.name)} ?required=${options.required} ?disabled=${options.disabled} aria-invalid=${options.error ? 'true' : 'false'} aria-describedby=${ifDefined(describedBy)} aria-errormessage=${ifDefined(errorId)} @change=${options.onInput}>${options.options}</select>${options.help ? html`<small id=${helpId} class="field-help">${options.help}</small>` : ''}${options.error ? html`<small id=${errorId} class="field-error" role="alert">${options.error}</small>` : ''}</div>`;
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
  return html`<div class=${['alert', `alert-${tone}`, 'ui-alert'].join(' ')} role=${tone === 'error' ? 'alert' : 'status'} aria-live=${tone === 'error' ? 'assertive' : 'polite'}>${content}</div>`;
}

export function gatewayEmptyState(content: string | TemplateResult): TemplateResult {
  return html`<div class="empty ui-empty-state gateway-empty-state" role="status">${content}</div>`;
}

export function gatewayLoadingState(label: string | TemplateResult): TemplateResult {
  return html`<div class="ui-loading-state" role="status" aria-live="polite" aria-busy="true"><span class="button-spinner" aria-hidden="true"></span><span>${label}</span></div>`;
}

export function gatewayDialog(title: string | TemplateResult, content: TemplateResult, actions: TemplateResult, ids: { dialogId?: string; titleId?: string; descriptionId?: string } = {}): TemplateResult {
  const dialogId = ids.dialogId ?? 'gateway-dialog';
  const titleId = ids.titleId ?? `${dialogId}-title`;
  const descriptionId = ids.descriptionId ?? `${dialogId}-description`;
  return html`<div class="modal-backdrop" role="presentation"><section id=${dialogId} class="modal ui-dialog" role="dialog" aria-modal="true" aria-labelledby=${titleId} aria-describedby=${descriptionId}><h2 id=${titleId}>${title}</h2><div id=${descriptionId}>${content}</div><div class="form-actions">${actions}</div></section></div>`;
}
