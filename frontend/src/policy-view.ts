import { html, type TemplateResult } from 'lit';
import type { Client, OperatorService, OperatorServicePolicy } from './models';

type Translator = (key: string) => string;
type EvaluatePolicy = (event: Event) => void;

type ToggleService = (service: string, checked: boolean) => void;
type SaveServices = () => void;

export type PolicyViewContext = {
  clients: Client[];
  busy: boolean;
  t: Translator;
  evaluatePolicy: EvaluatePolicy;
  operatorPolicy: OperatorServicePolicy | null;
  operatorPolicyDirty: boolean;
  toggleOperatorService: ToggleService;
  saveOperatorPolicy: SaveServices;
};

export function policyView(ctx: PolicyViewContext): TemplateResult {
  const grouped = new Map<string, OperatorService[]>();
  for (const service of ctx.operatorPolicy?.services ?? []) {
    const current = grouped.get(service.domain) ?? [];
    current.push(service);
    grouped.set(service.domain, current);
  }
  return html`<div class="split"><div class="card"><h2>${ctx.t('policyMatrix')}</h2><p>${ctx.t('policySubtitle')}</p><div style="margin-top:20px"><div class="tag">${ctx.t('policyReadAllowed')}</div><div class="tag">${ctx.t('policyMissingDenied')}</div><div class="tag">${ctx.t('policyMutationDenied')}</div><div class="tag">${ctx.t('policyOperatorDisabled')}</div></div></div><div class="card"><h2>${ctx.t('evaluateRequest')}</h2><form class="form" @submit=${ctx.evaluatePolicy}><label>${ctx.t('client')}<select name="client_id">${ctx.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label><label>${ctx.t('capability')}<input name="capability" value="ha.read.diagnostics" required /></label><label><span><input name="mutation" type="checkbox" style="width:auto; margin-right:7px" /> ${ctx.t('mutationRequest')}</span></label><div class="form-actions"><button class="primary" ?disabled=${ctx.busy}>${ctx.t('evaluate')}</button></div></form></div></div>
    <div class="card operator-policy-card"><div class="toolbar"><div><h2>Operator services</h2><p>Select the exact Home Assistant services that operator clients may request. Every mutation still requires approval.</p></div><button class="primary" type="button" @click=${ctx.saveOperatorPolicy} ?disabled=${ctx.busy || !ctx.operatorPolicyDirty}>Save services</button></div>${ctx.operatorPolicy ? html`<p class="muted">${ctx.operatorPolicy.selected.length} services selected. Changes apply without restarting the add-on.</p><div class="operator-service-groups">${[...grouped.entries()].sort().map(([domain, services]) => html`<section class="operator-service-group"><h3>${domain}</h3>${services.map((service) => html`<label class="capability-option operator"><input type="checkbox" .checked=${ctx.operatorPolicy?.selected.includes(service.id)} @change=${(event: Event) => ctx.toggleOperatorService(service.id, (event.target as HTMLInputElement).checked)} /><span><strong>${service.name} · <code>${service.id}</code></strong><small>${service.description}</small></span></label>`)}</section>`)}</div>` : html`<div class="empty">Home Assistant service catalog unavailable.</div>`}</div>`;
}
