import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { gatewayCard, gatewaySection, gatewayStatus } from '../ui-primitives';

type CardArgs = { title: string; description: string; status: 'ok' | 'warn' | 'bad' | '' };

const meta = {
  title: 'UI/Containers/Card',
  tags: ['autodocs'],
  args: { title: 'Gateway readiness', description: 'A calm opaque surface for one coherent piece of Gateway information.', status: 'ok' },
  argTypes: { status: { control: 'select', options: ['', 'ok', 'warn', 'bad'] } },
  render: (args: CardArgs) => html`<div class="story-surface"><div class="story-stack">${gatewayCard(html`<span class="story-label">Status</span><h2>${args.title}</h2><p class="story-copy">${args.description}</p>${gatewayStatus(args.status === 'ok' ? 'Ready' : args.status === 'warn' ? 'Partial' : args.status === 'bad' ? 'Blocked' : 'Unknown', args.status)}`)}${gatewaySection('Section card', html`<p class="story-copy">Sections share the same surface contract while allowing a header and description.</p>`)}</div></div>`,
} satisfies Meta<CardArgs>;

export default meta;
type Story = StoryObj<CardArgs>;

export const Default: Story = {};
export const Warning: Story = { args: { status: 'warn' } };
export const Blocked: Story = { args: { status: 'bad' } };
