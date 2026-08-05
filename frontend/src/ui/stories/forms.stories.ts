import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { gatewayAlert, gatewayEmptyState, gatewayLoadingState, gatewaySelect, gatewayTextField } from '../ui-primitives';

type FormArgs = { placeholder: string; disabled: boolean };

const meta = {
  title: 'UI/Forms/Fields and feedback',
  tags: ['autodocs'],
  args: { placeholder: 'Home observer', disabled: false },
  render: (args: FormArgs) => html`<div class="story-surface"><div class="story-stack">${gatewayTextField({ label: 'Display name', placeholder: args.placeholder, disabled: args.disabled, help: 'Visible to Gateway operators.' })}${gatewaySelect({ label: 'Profile', disabled: args.disabled, options: html`<option>Observer · read-only</option><option>Operator</option>` })}${gatewayAlert('Informational feedback stays calm and close to the affected content.', 'info')}${gatewayLoadingState('Checking Gateway')}${gatewayEmptyState('No records found.')}</div></div>`,
} satisfies Meta<FormArgs>;

export default meta;
type Story = StoryObj<FormArgs>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
