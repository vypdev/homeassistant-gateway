import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { gatewayTabGroup } from '../ui-primitives';

type NavigationArgs = { selected: string };

@customElement('gateway-story-tabs')
class GatewayStoryTabs extends LitElement {
  @property() selected = 'overview';

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  protected render() {
    const tabs = [
      { id: 'yaml', label: 'YAML' },
      { id: 'states', label: 'States' },
      { id: 'actions', label: 'Actions' },
      { id: 'template', label: 'Template' },
      { id: 'events', label: 'Events' },
      { id: 'statistics', label: 'Statistics' },
      { id: 'assist', label: 'Assist' },
    ];
    return html`${gatewayTabGroup(tabs.map((tab) => ({ ...tab, selected: tab.id === this.selected, onSelect: () => { this.selected = tab.id; } })), 'Developer tools navigation')}`;
  }
}

const meta = {
  title: 'UI/Navigation/Tabs',
  tags: ['autodocs'],
  args: { selected: 'yaml' },
  argTypes: { selected: { control: 'select', options: ['yaml', 'states', 'actions', 'template', 'events', 'statistics', 'assist'] } },
  render: (args: NavigationArgs) => html`<div class="story-surface"><div class="story-stack"><gateway-story-tabs .selected=${args.selected}></gateway-story-tabs></div></div>`,
} satisfies Meta<NavigationArgs>;

export default meta;
type Story = StoryObj<NavigationArgs>;
export const IconTabs: Story = {};
export const DevelopmentSelected: Story = { args: { selected: 'states' } };
export const ClientsSelected: Story = { args: { selected: 'actions' } };
