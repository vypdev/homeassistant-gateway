import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { gatewayIcon, gatewaySettingsMenu, type GatewaySettingsItem } from '../index';

const icons = {
  cloud: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96M19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.2 7.7 9.38 6 12 6c2.97 0 5.5 2.17 5.92 5.08l.08.92H19c1.66 0 3 1.34 3 3s-1.34 3-3 3Z',
  devices: 'M4 6h16v12H4V6m0-2c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4m2 4h12v4H6V8m0 6h5v2H6v-2m7 0h5v2h-5v-2Z',
  automation: 'M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2m0 4a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V6m2-4v6h6v-2h-4V2h-2Z',
  apps: 'M10 2H2v8h8V2m12 0h-8v8h8V2M10 14H2v8h8v-8m12 0h-8v8h8v-8Z',
  microphone: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3m5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21H9v2h6v-2h-2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7Z',
  person: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8m0 10c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4Z',
  cog: 'M12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5M19.43 12.97c.04-.32.07-.65.07-.97s-.02-.65-.07-.97l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.37-.31-.6-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98L14.5 2.42C14.47 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.5.42L9.12 5.07c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.08-.48 0-.6.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.08.65-.08.98s.03.65.08.97l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.37.31.6.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.08.48 0 .6-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65Z',
  tools: 'M22.7 19l-9.1-9.1c.9-2.2.4-4.8-1.4-6.6-2.3-2.3-5.9-2.3-8.2 0l3.7 3.7-2.1 2.1-3.7-3.7c-2.3 2.3-2.3 5.9 0 8.2 1.8 1.8 4.4 2.3 6.6 1.4l9.1 9.1c.4.4 1 .4 1.4 0l1.7-1.7c.4-.4.4-1 0-1.4m-3.4.7-8.5-8.5-1.4 1.4 8.5 8.5 1.4-1.4Z',
  info: 'M11 17h2v-6h-2v6m1-15A10 10 0 1 0 12 22 10 10 0 0 0 12 2m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m-1-11h2V7h-2v2Z',
};

const settingsGroups: readonly (readonly GatewaySettingsItem[])[] = [
  [
    { title: 'Home Assistant Cloud', description: 'Logged in and connected', iconPath: icons.cloud, iconTone: 'cloud' },
    { title: 'Devices & services', description: 'Integrations, devices, entities, and helpers', iconPath: icons.devices, iconTone: 'devices' },
    { title: 'Automations & scenes', description: 'Automations, scenes, scripts, and blueprints', iconPath: icons.automation, iconTone: 'automations' },
    { title: 'Apps', description: 'Run extra applications next to Home Assistant', iconPath: icons.apps, iconTone: 'apps' },
    { title: 'Voice assistants', description: 'Manage your voice assistants', iconPath: icons.microphone, iconTone: 'voice' },
  ],
  [
    { title: 'People', description: 'Manage who can access your home', iconPath: icons.person, iconTone: 'people' },
    { title: 'System', description: 'Create backups, check logs, or reboot your system', iconPath: icons.cog, iconTone: 'system' },
    { title: 'Tools', description: 'Inspect and debug your system', iconPath: icons.tools, iconTone: 'tools' },
    { title: 'About', description: 'Version information, credit, and more', iconPath: icons.info, iconTone: 'about' },
  ],
];

const meta = {
  title: 'UI/Home Assistant/Settings menu',
  tags: ['autodocs'],
  render: () => html`
    <div class="ha-reference-shell">
      <aside class="ha-reference-sidebar" aria-label="Home Assistant navigation">
        <button aria-label="Toggle sidebar">☰</button>
        <span>${gatewayIcon('M3 13h8V3H3v10m0 8h8v-6H3v6m10 0h8V11h-8v10m0-18v6h8V3h-8Z')}</span>
        <span>${gatewayIcon('M15 5v14l-6-2V3l6 2m1.5-2.5L9 0 2 2.5V22l7-2.5 7 2.5 6-2.5V2.5l-5.5 2Z')}</span>
        <span>${gatewayIcon('M11 21h-1l1-8H7.5L14 3h1l-1 8h3.5L11 21Z')}</span>
        <span class="sidebar-spacer"></span>
        <span class="sidebar-selected">${gatewayIcon(icons.cog)}</span>
        <span>${gatewayIcon('M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z')}</span>
        <span class="avatar">DU</span>
      </aside>
      <main class="ha-reference-main">
        <header class="ha-reference-header"><h1>Settings</h1><span>${gatewayIcon('M9.5 3a6.5 6.5 0 0 0 0 13c1.61 0 3.09-.59 4.23-1.57L19.23 20 20.64 18.59l-5.5-5.5A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 0 0 9.5 3m0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z')}</span><span>⋮</span></header>
        <div class="ha-reference-content">${gatewaySettingsMenu(settingsGroups)}</div>
      </main>
    </div>
  `,
} satisfies Meta;

export default meta;
type Story = StoryObj;
export const Landing: Story = {};
