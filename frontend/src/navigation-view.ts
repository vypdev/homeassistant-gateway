import { mdiAccountMultipleOutline, mdiBookOpenPageVariantOutline, mdiClipboardTextClockOutline, mdiFlaskOutline, mdiLanConnect, mdiShieldCheckOutline, mdiViewDashboardOutline } from '@mdi/js';
import { html, type TemplateResult } from 'lit';
import { gatewayTabBar, type GatewayTab } from './ui';
import type { View } from './models';

type Translator = (key: string) => string;
type Navigate = (view: View) => void;

type NavigationItem = { view: View; icon: string; key: string };

const EDGE_BUILD = import.meta.env.VITE_EDGE_CHANNEL === 'true';

const ITEMS: NavigationItem[] = [
  { view: 'overview', icon: mdiViewDashboardOutline, key: 'overview' },
  { view: 'development', icon: mdiFlaskOutline, key: 'development' },
  { view: 'clients', icon: mdiAccountMultipleOutline, key: 'clients' },
  { view: 'policy', icon: mdiShieldCheckOutline, key: 'policy' },
  { view: 'mcp', icon: mdiLanConnect, key: 'mcp' },
  { view: 'audit', icon: mdiClipboardTextClockOutline, key: 'audit' },
];

export function navigationView(current: View, translate: Translator, navigate: Navigate): TemplateResult {
  const items = EDGE_BUILD ? [...ITEMS, { view: 'catalog' as const, icon: mdiBookOpenPageVariantOutline, key: 'catalog' }] : ITEMS;
  const tabs: GatewayTab[] = items.map(({ view, icon, key }) => ({
    id: `navigation-${view}`,
    label: translate(key),
    icon,
    iconOnly: true,
    iconClassName: 'navigation-icon',
    selected: current === view,
    onSelect: () => navigate(view),
  }));
  return html`<nav class="tab-navigation" aria-label=${translate('navigation')}>${gatewayTabBar(tabs, translate('navigation'), 'navigation-tabs', 'dashboard')}</nav>`;
}
