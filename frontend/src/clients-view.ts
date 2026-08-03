import { html, type TemplateResult } from 'lit';
import type { Client } from './models';

type Translator = (key: string) => string;

export type ClientsViewContext = {
  clients: Client[];
  busy: boolean;
  t: Translator;
  refresh: () => void;
  createClient: (event: Event) => void;
  revoke: (clientId: string) => void;
  rotate: (clientId: string) => void;
  capabilitySelector: () => TemplateResult;
  operatorEnabled: boolean;
};

export function clientsView(ctx: ClientsViewContext): TemplateResult {
  return html`<div class="split"><div class="card"><div class="toolbar"><div><h2>${ctx.t('registeredClients')}</h2><p>${ctx.t('tokensNotListed')}</p></div><button class="secondary" @click=${() => ctx.refresh()} ?disabled=${ctx.busy}>${ctx.t('refresh')}</button></div>${ctx.clients.length ? html`<div class="table-wrap"><table><thead><tr><th>${ctx.t('identity')}</th><th>${ctx.t('profile')}</th><th>${ctx.t('capabilities')}</th><th>${ctx.t('status')}</th><th></th></tr></thead><tbody>${ctx.clients.map((client) => html`<tr><td><strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span></td><td><span class="tag">${client.profile}</span></td><td>${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</td><td class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</td><td>${client.status === 'active' ? html`<button class="danger" @click=${() => ctx.revoke(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('revoke')}</button><button class="secondary" @click=${() => ctx.rotate(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('rotate')}</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">${ctx.t('noClientsIssued')}</div>`}</div><div class="card"><h2>${ctx.t('issueObserverClient')}</h2><p style="margin-bottom:16px">${ctx.t('tokenShownOnce')}</p><form class="form" @submit=${ctx.createClient}><label>${ctx.t('clientId')}<input name="client_id" required maxlength="128" placeholder="nido-observer" /></label><label>${ctx.t('displayName')}<input name="display_name" required maxlength="256" placeholder="Nido house monitor" /></label><label>Profile<select name="profile"><option value="observer">observer · read-only</option><option value="operator" ?disabled=${!ctx.operatorEnabled}>operator${ctx.operatorEnabled ? '' : ' · disabled'}</option></select></label><label>${ctx.t('capabilities')}<small class="muted">${ctx.t('capabilitiesHelp')}</small>${ctx.capabilitySelector()}</label><div class="form-actions"><button class="primary" ?disabled=${ctx.busy}>${ctx.t('issueClient')}</button></div></form></div></div>`;
}
