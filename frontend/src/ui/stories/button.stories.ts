import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { gatewayButton, type GatewayButtonVariant } from '../ui-primitives';

type ButtonArgs = { label: string; variant: GatewayButtonVariant; disabled: boolean; loading: boolean };

const meta = {
  title: 'UI/Actions/Button',
  tags: ['autodocs'],
  args: { label: 'Add trigger', variant: 'primary', disabled: false, loading: false },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'link'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  render: (args: ButtonArgs) => html`<div class="story-surface"><div class="story-row">${gatewayButton({ ...args, leadingIcon: html`<svg class="gateway-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z"></path></svg>` })}</div></div>`,
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', label: 'Refresh' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Revoke' } };
export const Loading: Story = { args: { variant: 'secondary', label: 'Saving', loading: true } };
export const Disabled: Story = { args: { variant: 'secondary', label: 'Unavailable', disabled: true } };
