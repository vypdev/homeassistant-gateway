import { mdiAccountMultipleOutline, mdiClipboardTextClockOutline, mdiFlaskOutline, mdiLanConnect, mdiShieldCheckOutline, mdiViewDashboardOutline } from '@mdi/js';
import { html, type TemplateResult } from 'lit';
import type { View } from './models';

type Translator = (key: string) => string;
type Navigate = (view: View) => void;

type NavigationItem = { view: View; icon: string; key: string };

const ITEMS: NavigationItem[] = [
  { view: 'overview', icon: mdiViewDashboardOutline, key: 'overview' },
  { view: 'development', icon: mdiFlaskOutline, key: 'development' },
  { view: 'clients', icon: mdiAccountMultipleOutline, key: 'clients' },
  { view: 'policy', icon: mdiShieldCheckOutline, key: 'policy' },
  { view: 'mcp', icon: mdiLanConnect, key: 'mcp' },
  { view: 'audit', icon: mdiClipboardTextClockOutline, key: 'audit' },
];

function leadingIcon(path: string): TemplateResult {
  return html`<svg class="navigation-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${path}></path></svg>`;
}

function handleKeyDown(event: KeyboardEvent, index: number, navigate: Navigate): void {
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  const targetIndex = event.key === 'Home' ? 0 : event.key === 'End' ? ITEMS.length - 1 : direction ? (index + direction + ITEMS.length) % ITEMS.length : -1;
  if (targetIndex < 0) return;
  event.preventDefault();
  const target = event.currentTarget as HTMLButtonElement;
  const tablist = target.parentElement;
  const next = tablist?.querySelector<HTMLButtonElement>(`[data-tab-index="${targetIndex}"]`);
  next?.focus();
  navigate(ITEMS[targetIndex].view);
}

export function navigationView(current: View, translate: Translator, navigate: Navigate): TemplateResult {
  return html`<nav class="tab-navigation" aria-label=${translate('navigation')} role="tablist">
    ${ITEMS.map(({ view, icon, key }, index) => html`<button
      class="navigation-tab"
      data-tab-index=${index}
      type="button"
      role="tab"
      aria-selected=${current === view}
      aria-current=${current === view ? 'page' : 'false'}
      aria-label=${translate(key)}
      title=${translate(key)}
      tabindex=${current === view ? '0' : '-1'}
      @click=${() => navigate(view)}
      @keydown=${(event: KeyboardEvent) => handleKeyDown(event, index, navigate)}
    >${leadingIcon(icon)}<span class="sr-only">${translate(key)}</span></button>`)}
  </nav>`;
}
