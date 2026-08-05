import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { gatewayButton } from '../ui-primitives';
import { gatewayMetricCard, gatewayResultRow, gatewayStack, gatewayTagList, gatewayToolbar } from '../ui-layouts';

type LayoutArgs = { title: string; description: string; dark: boolean };

const meta = {
  title: 'UI/Layout/Operational surfaces',
  tags: ['autodocs'],
  args: {
    title: 'Gateway readiness',
    description: 'Status surfaces use the same quiet density as Home Assistant operational panels.',
    dark: false,
  },
  argTypes: { dark: { control: 'boolean' } },
  render: (args: LayoutArgs) => html`
    <div class=${args.dark ? 'story-surface dark' : 'story-surface'}>
      ${gatewayToolbar(args.title, args.description, gatewayButton({ label: 'Refresh', variant: 'secondary' }))}
      ${gatewayStack(html`
        <div class="story-grid">${gatewayMetricCard('Storage', 'Ready', 'Private application state', 'ok')}${gatewayMetricCard('Home Assistant', 'Partial', 'Upstream health', 'warn')}${gatewayMetricCard('Clients', '3', 'Bearer identities')}</div>
        ${gatewayResultRow('Core health', 'HTTP 200 · 42 ms', { label: 'Ready', tone: 'ok' }, gatewayButton({ label: 'Inspect', variant: 'link' }))}
        ${gatewayTagList(['Ingress trusted', 'Read-only MCP', 'Token digests'])}
      `)}
    </div>
  `,
} satisfies Meta<LayoutArgs>;

export default meta;
type Story = StoryObj<LayoutArgs>;
export const Default: Story = {};
export const Dark: Story = { args: { dark: true } };
