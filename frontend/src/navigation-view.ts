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

export function navigationView(current: View, translate: Translator, navigate: Navigate): TemplateResult {
  return html`<nav aria-label=${translate('navigation')}>${ITEMS.map(({ view, icon, key }) => html`<button class=${current === view ? 'active' : ''} type="button" @click=${() => navigate(view)}>${leadingIcon(icon)}<span>${translate(key)}</span></button>`)}</nav>`;
}
