import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  mdiArrowRight,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiPlus,
  mdiRefresh,
} from '@mdi/js';
import {
  gatewayAlert,
  gatewayButton,
  gatewayDialog,
  gatewayIcon,
  gatewayIconButton,
  gatewaySection,
  gatewaySelect,
} from '../ui-primitives';
import {
  gatewayBadge,
  gatewayColumns,
  gatewayFormActions,
  gatewayHeading,
  gatewayLabel,
  gatewayRow,
  gatewayTable,
  gatewayMetricCard,
  gatewayResultRow,
  gatewayStack,
  gatewayTagList,
  gatewayToolbar,
} from '../ui-layouts';

type Family = 'foundations' | 'icon-button' | 'card-section' | 'rows-columns' | 'toolbar-metrics' | 'tags-actions' | 'dialog';
type FamilyArgs = { family: Family; dark: boolean };

const meta = {
  title: 'UI/Home Assistant/Component families',
  tags: ['autodocs'],
  args: { family: 'card-section', dark: false },
  argTypes: {
    family: { control: 'select', options: ['foundations', 'icon-button', 'card-section', 'rows-columns', 'toolbar-metrics', 'tags-actions', 'dialog'] },
    dark: { control: 'boolean' },
  },
  render: (args: FamilyArgs) => html`<div class=${args.dark ? 'story-surface theme-dark' : 'story-surface'}>${renderFamily(args.family)}</div>`,
} satisfies Meta<FamilyArgs>;

function renderFamily(family: Family) {
  switch (family) {
    case 'foundations':
      return html`<div class="family-preview">
        ${gatewayHeading('Foundations', 'Titles, text, labels, badges, rows, columns and data surfaces.')}
        <p class="story-copy">Primary body text with <span class="muted">secondary supporting text</span> and a <a href="#">semantic link</a>.</p>
        ${gatewayRow(html`${gatewayLabel('Profile')}${gatewayBadge('Connected', 'success')}${gatewayBadge('Needs attention', 'warning')}${gatewayBadge('Blocked', 'danger')}`)}
        ${gatewayColumns(html`<div class="story-card"><strong>Overview</strong><p class="muted">A compact column surface.</p></div><div class="story-card"><strong>Details</strong><p class="muted">Neutral supporting content.</p></div><div class="story-card"><strong>State</strong><p class="muted">Ready for interaction.</p></div>`, 3)}
        ${gatewayTable(['Name', 'State', 'Updated'], [['Gateway', gatewayBadge('Ready', 'success'), 'Just now'], ['Home Assistant', gatewayBadge('Partial', 'warning'), '2 min ago'], ['Client access', gatewayBadge('Blocked', 'danger'), '5 min ago']])}
      </div>`;
    case 'icon-button':
      return html`<div class="family-preview family-preview-icon-button">
        <span class="story-label">Icon buttons</span>
        <div class="story-row">
          ${gatewayIconButton(mdiDotsVertical, 'More options', () => undefined)}
          ${gatewayIconButton(mdiRefresh, 'Refresh', () => undefined)}
          ${gatewayIconButton(mdiArrowRight, 'Open', () => undefined, true)}
        </div>
      </div>`;
    case 'card-section':
      return gatewaySection('Actions', html`<p class="story-copy">Perform an action available in Home Assistant.</p>${gatewaySelect({ id: 'family-action', label: 'Action', appearance: 'ha-reference', options: html`<option selected>Choose an action</option><option>Light: turn on</option>` })}`, 'Developer Tools surface');
    case 'rows-columns':
      return html`<div class="family-preview"><span class="story-label">Rows and columns</span>${gatewayStack(html`
        ${gatewayResultRow('Core health', 'HTTP 200 · 42 ms', { label: 'Ready', tone: 'ok' }, gatewayButton({ label: 'Inspect', variant: 'link' }))}
        ${gatewayResultRow('Home Assistant', 'Connected · read-only', { label: 'Connected', tone: 'ok' }, gatewayIconButton(mdiArrowRight, 'Open Home Assistant', () => undefined))}
        <div class="family-columns"><div class="story-card"><strong>Storage</strong><span class="muted">Ready</span></div><div class="story-card"><strong>Clients</strong><span class="muted">3 connected</span></div></div>
      `)}</div>`;
    case 'toolbar-metrics':
      return html`<div class="family-preview">${gatewayToolbar('Gateway readiness', 'Operational status across the Gateway.', gatewayButton({ label: 'Refresh', variant: 'secondary', leadingIcon: gatewayIcon(mdiRefresh) }))}<div class="family-metrics">${gatewayMetricCard('Storage', 'Ready', 'Private application state', 'ok')}${gatewayMetricCard('Home Assistant', 'Partial', 'Upstream health', 'warn')}${gatewayMetricCard('Clients', '3', 'Bearer identities')}</div></div>`;
    case 'tags-actions':
      return html`<div class="family-preview"><span class="story-label">Tags, feedback and form actions</span>${gatewayTagList(['Ingress trusted', 'Read-only MCP', 'Token digests'])}${gatewayAlert(html`${gatewayIcon(mdiInformationOutline)}<span>Changes are saved automatically.</span>`, 'info')}${gatewayFormActions(html`${gatewayButton({ label: 'Cancel', variant: 'secondary' })}${gatewayButton({ label: 'Save', variant: 'primary' })}`)}</div>`;
    case 'dialog':
      return html`<div class="family-preview dialog-preview">${gatewayDialog('Revoke client?', html`<p>This action permanently invalidates the client token.</p>`, html`${gatewayButton({ label: 'Cancel', variant: 'secondary' })}${gatewayButton({ label: 'Revoke', variant: 'danger', leadingIcon: gatewayIcon(mdiPlus) })}`, { dialogId: 'family-dialog' })}</div>`;
  }
}

export default meta;
type Story = StoryObj<FamilyArgs>;
export const Foundations: Story = { args: { family: 'foundations' } };
export const IconButton: Story = { args: { family: 'icon-button' } };
export const CardSection: Story = { args: { family: 'card-section' } };
export const RowsAndColumns: Story = { args: { family: 'rows-columns' } };
export const ToolbarAndMetrics: Story = { args: { family: 'toolbar-metrics' } };
export const TagsAndFormActions: Story = { args: { family: 'tags-actions' } };
export const Dialog: Story = { args: { family: 'dialog' } };
