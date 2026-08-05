import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayTextField } from './ui-primitives';
import type { Discovery, Ready } from './models';

type Translator = (key: string) => string;
type LoadDiscovery = (event: Event) => void;

export type McpViewContext = { ready: Ready | null; discovery: Discovery | null; busy: boolean; t: Translator; loadDiscovery: LoadDiscovery };

export function mcpView(ctx: McpViewContext): TemplateResult {
  return html`<div class="split"><div class="card"><h2>${ctx.t('streamableHttp')}</h2><p>${ctx.t('authenticatedEndpoint')}</p><div class="token mono mcp-endpoint">/mcp/</div><p>${ctx.t('transport')}: <span class="ok">${ctx.ready?.mcp ?? 'unknown'}</span></p><p class="mcp-tool">${ctx.t('tool')}: <code>${ctx.discovery?.tools[0] ?? ctx.t('discovery')}</code></p>${ctx.discovery ? html`<div class="tag-list">${ctx.discovery.tools.map((tool) => html`<span class="tag">${tool}</span>`)}</div>` : ''}</div><div class="card"><h2>${ctx.t('discovery')}</h2><p class="mcp-subtitle">${ctx.t('mcpSubtitle')}</p><form class="form" @submit=${ctx.loadDiscovery}>${gatewayTextField({ label: ctx.t('bearerToken'), name: 'token', type: 'password', required: true, placeholder: 'hgw_…' })}<div class="form-actions">${gatewayButton({ label: ctx.t('loadDiscovery'), variant: 'primary', type: 'submit', disabled: ctx.busy })}</div></form>${ctx.discovery ? html`<div class="mcp-capabilities"><span class="tag">${ctx.discovery.client_id}</span><span class="tag">${ctx.discovery.profile}</span>${ctx.discovery.capabilities.map((item) => html`<span class="tag">${item}</span>`)}</div>` : ''}</div></div>`;
}
