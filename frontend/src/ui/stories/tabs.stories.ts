import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { mdiAccountMultipleOutline, mdiFlaskOutline, mdiViewDashboardOutline } from '@mdi/js';
import { gatewayTabGroup } from '../ui-primitives';

type NavigationArgs = { selected: string };

const meta = {
  title: 'UI/Navigation/Tabs',
  tags: ['autodocs'],
  args: { selected: 'overview' },
  argTypes: { selected: { control: 'select', options: ['overview', 'development', 'clients'] } },
  render: (args: NavigationArgs) => {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: mdiViewDashboardOutline },
      { id: 'development', label: 'Development', icon: mdiFlaskOutline },
      { id: 'clients', label: 'Clients', icon: mdiAccountMultipleOutline },
    ];
    return html`<div class="story-surface"><div class="story-stack">${gatewayTabGroup(tabs.map((tab) => ({ ...tab, selected: tab.id === args.selected, onSelect: () => undefined })), 'Gateway navigation')}<p class="story-copy">Flat icon tabs with a bottom indicator. Labels remain available to assistive technology and appear as tooltips.</p></div></div>`;
  },
} satisfies Meta<NavigationArgs>;

export default meta;
type Story = StoryObj<NavigationArgs>;

export const IconTabs: Story = {};
export const DevelopmentSelected: Story = { args: { selected: 'development' } };
export const ClientsSelected: Story = { args: { selected: 'clients' } };
