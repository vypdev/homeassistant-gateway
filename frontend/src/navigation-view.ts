import { mdiAccountMultipleOutline, mdiClipboardTextClockOutline, mdiFlaskOutline, mdiLanConnect, mdiShieldCheckOutline, mdiViewDashboardOutline } from '@mdi/js';
import { html, type TemplateResult } from 'lit';
import { gatewayTabGroup, type GatewayTab } from './ui';
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

export function navigationView(current: View, translate: Translator, navigate: Navigate): TemplateResult {
  const tabs: GatewayTab[] = ITEMS.map(({ view, icon, key }) => ({
    id: `navigation-${view}`,
    label: translate(key),
    icon,
    selected: current === view,
    onSelect: () => navigate(view),
  }));
  return html`<nav class="tab-navigation" aria-label=${translate('navigation')}>${gatewayTabGroup(tabs, translate('navigation'), 'navigation-tabs')}</nav>`;
}
