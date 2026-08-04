import { html, type TemplateResult } from 'lit';
import type { Client, OperatorService, OperatorServicePolicy } from './models';

type Translator = (key: string) => string;
type EvaluatePolicy = (event: Event) => void;
type ToggleService = (service: string, checked: boolean) => void;
type ToggleServiceGroup = (services: string[], checked: boolean) => void;

export type PolicyViewContext = {
  clients: Client[];
  busy: boolean;
  t: Translator;
  evaluatePolicy: EvaluatePolicy;
  operatorPolicy: OperatorServicePolicy | null;
  toggleOperatorService: ToggleService;
  toggleOperatorServiceGroup: ToggleServiceGroup;
};

export function policyView(ctx: PolicyViewContext): TemplateResult {
  const policy = ctx.operatorPolicy;
  const selected = new Set(policy?.selected ?? []);
  const grouped = new Map<string, OperatorService[]>();
  for (const service of policy?.services ?? []) {
    const current = grouped.get(service.domain) ?? [];
    current.push(service);
    grouped.set(service.domain, current);
  }
  const serviceGrantCount = (serviceId: string) => ctx.clients.filter((client) => client.profile === 'operator' && client.status === 'active' && client.operator_services.includes(serviceId)).length;
  const grantedClients = ctx.clients.filter((client) => client.profile === 'operator' && client.status === 'active' && client.operator_services.some((service) => selected.has(service))).length;
  const domainCount = grouped.size;

  return html`
    <div class="split">
      <div class="card">
        <h2>${ctx.t('policyMatrix')}</h2>
        <p>${ctx.t('policySubtitle')}</p>
        <div class="policy-tags">
          <div class="tag">${ctx.t('policyReadAllowed')}</div>
          <div class="tag">${ctx.t('policyMissingDenied')}</div>
          <div class="tag">${ctx.t('policyMutationDenied')}</div>
          <div class="tag">${ctx.t('policyOperatorDisabled')}</div>
        </div>
      </div>
      <div class="card">
        <h2>${ctx.t('evaluateRequest')}</h2>
        <form class="form" @submit=${ctx.evaluatePolicy}>
          <label>${ctx.t('client')}<select name="client_id">${ctx.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label>
          <label>${ctx.t('capability')}<input name="capability" value="ha.read.diagnostics" required /></label>
          <label><span><input name="mutation" type="checkbox" class="inline-checkbox" /> ${ctx.t('mutationRequest')}</span></label>
          <div class="form-actions"><button class="primary" ?disabled=${ctx.busy}><span class="button-leading-icon" aria-hidden="true">✓</span>${ctx.t('evaluate')}</button></div>
        </form>
      </div>
    </div>

    <section class="card operator-policy-card" aria-labelledby="operator-services-title">
      <div class="operator-policy-header">
        <div>
          <h2 id="operator-services-title">${ctx.t('operatorServicesTitle')}</h2>
          <p>${ctx.t('operatorServicesSubtitle')}</p>
        </div>
      </div>

      ${policy ? html`
        <div class="operator-policy-notice" role="note">
          <strong>${ctx.t('operatorServicesSummary')}</strong>
          <span>${ctx.t('operatorServicesNotGrant')}</span>
          <span>${ctx.t('operatorServicesGrantHint')}</span>
        </div>

        <div class="operator-policy-summary" aria-label=${ctx.t('operatorServicesSummary')}>
          <div class="policy-summary-item"><strong>${selected.size}</strong><span>${ctx.t('operatorServicesSelected')}</span></div>
          <div class="policy-summary-item"><strong>${policy.services.length}</strong><span>${ctx.t('operatorServicesEnabled')}</span></div>
          <div class="policy-summary-item"><strong>${domainCount}</strong><span>${ctx.t('operatorServicesDomains')}</span></div>
          <div class="policy-summary-item"><strong>${grantedClients}</strong><span>${ctx.t('operatorServicesClients')}</span></div>
        </div>

        <p class="muted operator-policy-change-note">${ctx.t('operatorServicesChanges')} ${ctx.t('operatorServicesRequiresApproval')}</p>
        <div class="operator-service-groups">
          ${[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, services]) => html`
            <section class="operator-service-group" aria-labelledby=${`operator-domain-${domain}`}>
              <div class="operator-service-group-header">
                <h3 id=${`operator-domain-${domain}`}>${domain}</h3>
                ${(() => {
                  const groupSelected = services.some((service) => selected.has(service.id));
                  return html`<button type="button" class="secondary operator-service-group-action" @click=${() => ctx.toggleOperatorServiceGroup(services.map((service) => service.id), !groupSelected)}>${ctx.t(groupSelected ? 'operatorServicesClearAll' : 'operatorServicesSelectAll')}</button>`;
                })()}
              </div>
              <div class="operator-service-list">
                ${services.map((service) => html`
                  <label class="operator-service-option">
                    <input type="checkbox" .checked=${selected.has(service.id)} @change=${(event: Event) => ctx.toggleOperatorService(service.id, (event.target as HTMLInputElement).checked)} />
                    <span><strong>${service.name} · <code>${service.id}</code></strong><small>${service.description}</small><small class="operator-service-meta">${ctx.t('operatorServicesGrantedTo').replace('{count}', String(serviceGrantCount(service.id)))}${!selected.has(service.id) && serviceGrantCount(service.id) ? ` · ${ctx.t('operatorServicesGlobalBlocked')}` : ''}</small></span>
                  </label>
                `)}
              </div>
            </section>
          `)}
        </div>
      ` : html`<div class="empty">${ctx.t('operatorServicesUnavailable')}</div>`}
    </section>
  `;
}
