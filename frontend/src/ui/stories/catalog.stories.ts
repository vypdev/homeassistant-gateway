import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  mdiAlertCircleOutline,
  mdiClose,
  mdiDeleteOutline,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiPlus,
  mdiRefresh,
} from '@mdi/js';
import {
  gatewayAlert,
  gatewayButton,
  gatewayCard,
  gatewayDialog,
  gatewayEmptyState,
  gatewayIcon,
  gatewayIconButton,
  gatewayLoadingState,
  gatewaySelect,
  gatewayStatus,
  gatewayTabGroup,
  gatewayTextField,
} from '../ui-primitives';

type MatrixArgs = { dark: boolean };

const tabs = [
  { id: 'yaml', label: 'YAML', selected: true, onSelect: () => undefined },
  { id: 'states', label: 'States', selected: false, onSelect: () => undefined },
  { id: 'actions', label: 'Actions', selected: false, onSelect: () => undefined },
  { id: 'template', label: 'Template', selected: false, onSelect: () => undefined },
  { id: 'events', label: 'Events', selected: false, onSelect: () => undefined },
  { id: 'statistics', label: 'Statistics', selected: false, onSelect: () => undefined },
  { id: 'assist', label: 'Assist', selected: false, onSelect: () => undefined },
];

const meta = {
  title: 'UI/Home Assistant control matrix',
  tags: ['autodocs'],
  args: { dark: false },
  argTypes: { dark: { control: 'boolean' } },
  render: (args: MatrixArgs) => html`
    <div class=${args.dark ? 'story-surface theme-dark' : 'story-surface'}>
      <div class="story-matrix">
        <section class="story-matrix-section">
          <span class="story-label">Actions</span>
          <div class="story-inline">
            ${gatewayButton({ label: 'Add trigger', variant: 'primary', leadingIcon: gatewayIcon(mdiPlus) })}
            ${gatewayButton({ label: 'Refresh', variant: 'secondary', leadingIcon: gatewayIcon(mdiRefresh) })}
            ${gatewayButton({ label: 'Revoke', variant: 'danger', leadingIcon: gatewayIcon(mdiDeleteOutline) })}
            ${gatewayButton({ label: 'Warning', variant: 'warning' })}
            ${gatewayButton({ label: 'Success', variant: 'success' })}
            ${gatewayButton({ label: 'Learn more', variant: 'link' })}
            ${gatewayButton({ label: 'Saving', variant: 'secondary', loading: true })}
            ${gatewayButton({ label: 'Unavailable', variant: 'secondary', disabled: true })}
            ${gatewayIconButton(mdiDotsVertical, 'More actions', () => undefined)}
          </div>
        </section>

        <section class="story-matrix-section">
          <span class="story-label">Navigation and status</span>
          ${gatewayTabGroup(tabs, 'Home Assistant navigation')}
          <div class="story-inline">
            ${gatewayStatus('Connected', 'ok')}
            ${gatewayStatus('Needs attention', 'warn')}
            ${gatewayStatus('Blocked', 'bad')}
            ${gatewayStatus('Unknown', '')}
          </div>
        </section>

        <section class="story-matrix-section">
          <span class="story-label">Fields</span>
          <div class="story-matrix-fields">
            ${gatewayTextField({ id: 'matrix-name', label: 'Display name', value: 'Home observer', help: 'Visible to Gateway operators.' })}
            ${gatewaySelect({ id: 'matrix-profile', label: 'Profile', options: html`<option>Observer · read-only</option><option>Operator</option>` })}
            ${gatewayTextField({ id: 'matrix-error', label: 'Endpoint', value: 'homeassistant.local', error: 'Enter a valid endpoint.' })}
          </div>
          <div class="story-reference-select">${gatewaySelect({ id: 'matrix-ha-select', label: 'Set state', appearance: 'ha-reference', options: html`<option selected>Set state</option><option>On</option><option>Off</option>` })}</div>
        </section>

        <section class="story-matrix-section">
          <span class="story-label">Feedback</span>
          ${gatewayAlert(html`${gatewayIcon(mdiInformationOutline)} Informational feedback stays close to the affected content.`, 'info')}
          ${gatewayAlert(html`${gatewayIcon(mdiAlertCircleOutline)} Something needs your attention.`, 'warning')}
          ${gatewayLoadingState('Checking Gateway')}
          ${gatewayEmptyState('No records found.')}
        </section>

        <section class="story-matrix-section">
          <span class="story-label">Surfaces and dialog</span>
          ${gatewayCard(html`<span class="story-label">Gateway</span><h2>Home Assistant Gateway</h2><p class="story-copy">Read-only access is ready.</p>${gatewayStatus('Ready', 'ok')}`)}
          ${gatewayDialog(
            'Revoke client?',
            html`<p>This action permanently invalidates the client token.</p>`,
            html`${gatewayButton({ label: 'Cancel', variant: 'secondary' })}${gatewayButton({ label: 'Revoke', variant: 'danger', leadingIcon: gatewayIcon(mdiClose) })}`,
            { dialogId: 'matrix-dialog' },
          )}
        </section>
      </div>
    </div>
  `,
} satisfies Meta<MatrixArgs>;

export default meta;
type Story = StoryObj<MatrixArgs>;

export const Light: Story = {};
export const Dark: Story = { args: { dark: true } };
