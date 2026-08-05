import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayCard, gatewayFormActions, gatewayTagList, gatewayTextField } from './ui';
import type { Discovery, Ready } from './models';

type Translator = (key: string) => string;
type LoadDiscovery = (event: Event) => void;

export type McpViewContext = { ready: Ready | null; discovery: Discovery | null; busy: boolean; t: Translator; loadDiscovery: LoadDiscovery };

export function mcpView(ctx: McpViewContext): TemplateResult {
  return html`<div class="split">
    ${gatewayCard(html`<h2>${ctx.t('streamableHttp')}</h2><p>${ctx.t('authenticatedEndpoint')}</p><div class="token mono mcp-endpoint">/mcp/</div><p>${ctx.t('transport')}: <span class="ok">${ctx.ready?.mcp ?? 'unknown'}</span></p><p class="mcp-tool">${ctx.t('tool')}: <code>${ctx.discovery?.tools[0] ?? ctx.t('discovery')}</code>${ctx.discovery ? gatewayTagList(ctx.discovery.tools) : ''}`)}
    ${gatewayCard(html`<h2>${ctx.t('discovery')}</h2><p class="mcp-subtitle">${ctx.t('mcpSubtitle')}</p><form class="form" @submit=${ctx.loadDiscovery}>${gatewayTextField({ id: 'mcp-bearer-token', label: ctx.t('bearerToken'), name: 'token', type: 'password', required: true, placeholder: 'hgw_…' })}${gatewayFormActions(gatewayButton({ label: ctx.t('loadDiscovery'), variant: 'primary', type: 'submit', disabled: ctx.busy }))}</form>${ctx.discovery ? html`<div class="mcp-capabilities">${gatewayTagList([ctx.discovery.client_id, ctx.discovery.profile, ...ctx.discovery.capabilities])}</div>` : ''}`)}
  </div>`;
}
