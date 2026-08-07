import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { mdiAccountMultipleOutline, mdiClipboardTextClockOutline, mdiFlaskOutline, mdiLanConnect, mdiShieldCheckOutline, mdiViewDashboardOutline } from '@mdi/js';
import { gatewayTabBar } from '../ui-primitives';

type Args = { selected: string };

const items = [
  ['overview', 'Overview', mdiViewDashboardOutline],
  ['development', 'Development', mdiFlaskOutline],
  ['clients', 'Clients', mdiAccountMultipleOutline],
  ['policy', 'Policy', mdiShieldCheckOutline],
  ['mcp', 'MCP', mdiLanConnect],
  ['audit', 'Audit', mdiClipboardTextClockOutline],
] as const;

const meta = {
  title: 'UI/Navigation/TabBar',
  tags: ['autodocs'],
  args: { selected: 'overview' },
  argTypes: { selected: { control: 'select', options: items.map(([id]) => id) } },
  render: (args: Args) => html`<div class="story-surface story-surface-tab-bar"><div class="story-tab-bar-frame">${gatewayTabBar(items.map(([id, label, icon]) => ({ id: `dashboard-${id}`, label, icon, iconOnly: true, selected: args.selected === id, onSelect: () => { args.selected = id; } })), 'Gateway dashboard navigation', 'storybook-dashboard-tab-bar', 'dashboard')}</div></div>`,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Dashboard: Story = {};