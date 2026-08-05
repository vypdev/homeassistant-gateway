import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { mdiAccountMultipleOutline, mdiFlaskOutline, mdiViewDashboardOutline } from '@mdi/js';
import { gatewayTabGroup } from '../ui-primitives';

type NavigationArgs = { selected: string };

@customElement('gateway-story-tabs')
class GatewayStoryTabs extends LitElement {
  @property() selected = 'overview';

  protected render() {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: mdiViewDashboardOutline },
      { id: 'development', label: 'Development', icon: mdiFlaskOutline },
      { id: 'clients', label: 'Clients', icon: mdiAccountMultipleOutline },
    ];
    return html`${gatewayTabGroup(tabs.map((tab) => ({ ...tab, selected: tab.id === this.selected, onSelect: () => { this.selected = tab.id; } })), 'Gateway navigation')}<p class="story-copy">Selected tab: <strong>${this.selected}</strong></p>`;
  }
}

const meta = {
  title: 'UI/Navigation/Tabs',
  tags: ['autodocs'],
  args: { selected: 'overview' },
  argTypes: { selected: { control: 'select', options: ['overview', 'development', 'clients'] } },
  render: (args: NavigationArgs) => html`<div class="story-surface"><div class="story-stack"><gateway-story-tabs .selected=${args.selected}></gateway-story-tabs><p class="story-copy">Flat icon tabs with a 2px bottom indicator and roving keyboard focus.</p></div></div>`,
} satisfies Meta<NavigationArgs>;

export default meta;
type Story = StoryObj<NavigationArgs>;
export const IconTabs: Story = {};
export const DevelopmentSelected: Story = { args: { selected: 'development' } };
export const ClientsSelected: Story = { args: { selected: 'clients' } };
