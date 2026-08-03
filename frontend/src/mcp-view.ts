import { html, type TemplateResult } from 'lit';
import type { Discovery, Ready } from './models';

type Translator = (key: string) => string;
type LoadDiscovery = (event: Event) => void;

export type McpViewContext = { ready: Ready | null; discovery: Discovery | null; busy: boolean; t: Translator; loadDiscovery: LoadDiscovery };

export function mcpView(ctx: McpViewContext): TemplateResult {
  return html`<div class="split"><div class="card"><h2>${ctx.t('streamableHttp')}</h2><p>${ctx.t('authenticatedEndpoint')}</p><div class="token mono" style="margin-top:20px">/mcp/</div><p>${ctx.t('transport')}: <span class="ok">${ctx.ready?.mcp ?? 'unknown'}</span></p><p style="margin-top:8px">${ctx.t('tool')}: <code>${ctx.discovery?.tools[0] ?? ctx.t('discovery')}</code></p>${ctx.discovery ? html`<div class="tag-list">${ctx.discovery.tools.map((tool) => html`<span class="tag">${tool}</span>`)}</div>` : ''}</div><div class="card"><h2>${ctx.t('discovery')}</h2><p style="margin-bottom:16px">${ctx.t('mcpSubtitle')}</p><form class="form" @submit=${ctx.loadDiscovery}><label>${ctx.t('bearerToken')}<input name="token" type="password" required placeholder="hgw_…" /></label><div class="form-actions"><button class="primary" ?disabled=${ctx.busy}>${ctx.t('loadDiscovery')}</button></div></form>${ctx.discovery ? html`<div style="margin-top:18px"><span class="tag">${ctx.discovery.client_id}</span><span class="tag">${ctx.discovery.profile}</span>${ctx.discovery.capabilities.map((item) => html`<span class="tag">${item}</span>`)}</div>` : ''}</div></div>`;
}
