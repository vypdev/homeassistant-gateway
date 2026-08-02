import { html, type TemplateResult } from 'lit';
import type { Client } from './models';

type Translator = (key: string) => string;
type EvaluatePolicy = (event: Event) => void;

export type PolicyViewContext = { clients: Client[]; busy: boolean; t: Translator; evaluatePolicy: EvaluatePolicy };

export function policyView(ctx: PolicyViewContext): TemplateResult {
  return html`<div class="split"><div class="card"><h2>${ctx.t('policyMatrix')}</h2><p>${ctx.t('policySubtitle')}</p><div style="margin-top:20px"><div class="tag">${ctx.t('policyReadAllowed')}</div><div class="tag">${ctx.t('policyMissingDenied')}</div><div class="tag">${ctx.t('policyMutationDenied')}</div><div class="tag">${ctx.t('policyOperatorDisabled')}</div></div></div><div class="card"><h2>${ctx.t('evaluateRequest')}</h2><form class="form" @submit=${ctx.evaluatePolicy}><label>${ctx.t('client')}<select name="client_id">${ctx.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label><label>${ctx.t('capability')}<input name="capability" value="ha.read.diagnostics" required /></label><label><span><input name="mutation" type="checkbox" style="width:auto; margin-right:7px" /> ${ctx.t('mutationRequest')}</span></label><div class="form-actions"><button class="primary" ?disabled=${ctx.busy}>${ctx.t('evaluate')}</button></div></form></div></div>`;
}
