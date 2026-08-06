import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayCard, gatewayCheckbox, gatewayCheckboxGroup, gatewayEmptyState, gatewayFormActions, gatewaySelect, gatewayTextField, type GatewayCheckboxGroupOption } from './ui';
import type { Client, OperatorService, OperatorServicePolicy } from './models';

type Translator = (key: string) => string;
type EvaluatePolicy = (event: Event) => void;
type ToggleService = (service: string, checked: boolean) => void;
type ToggleServiceGroup = (services: string[], checked: boolean) => void;

function gatewayCheckboxGroupOption(service: OperatorService, selected: ReadonlySet<string>, serviceGrantCount: (serviceId: string) => number, ctx: PolicyViewContext): GatewayCheckboxGroupOption {
  const grants = serviceGrantCount(service.id);
  return {
    value: service.id,
    label: service.name,
    description: html`${service.description}<span class="operator-service-meta">${ctx.t('operatorServicesGrantedTo').replace('{count}', String(grants))}${!selected.has(service.id) && grants ? ` · ${ctx.t('operatorServicesGlobalBlocked')}` : ''}</span>`,
    checked: selected.has(service.id),
    className: 'operator-service-option',
    onChange: (event) => ctx.toggleOperatorService(service.id, (event.target as HTMLInputElement).checked),
  };
}

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
      ${gatewayCard(html`
        <h2>${ctx.t('policyMatrix')}</h2>
        <p>${ctx.t('policySubtitle')}</p>
        <div class="policy-tags">
          <div class="tag">${ctx.t('policyReadAllowed')}</div>
          <div class="tag">${ctx.t('policyMissingDenied')}</div>
          <div class="tag">${ctx.t('policyMutationDenied')}</div>
          <div class="tag">${ctx.t('policyOperatorDisabled')}</div>
        </div>
      `, 'policy-matrix-card')}
      ${gatewayCard(html`
        <h2>${ctx.t('evaluateRequest')}</h2>
        <form class="form" @submit=${ctx.evaluatePolicy}>
          ${gatewaySelect({ label: ctx.t('client'), name: 'client_id', options: html`${ctx.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}` })}
          ${gatewayTextField({ label: ctx.t('capability'), name: 'capability', value: 'ha.read.diagnostics', required: true })}
          ${gatewayCheckbox({ label: ctx.t('mutationRequest'), name: 'mutation' })}
          ${gatewayFormActions(gatewayButton({ label: ctx.t('evaluate'), variant: 'primary', type: 'submit', disabled: ctx.busy, leadingIcon: '✓' }))}
        </form>
      `, 'policy-evaluation-card')}
    </div>

    ${gatewayCard(html`
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
          ${[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, services]) => {
            const groupSelected = services.some((service) => selected.has(service.id));
            return gatewayCheckboxGroup({
              selectedCount: services.filter((service) => selected.has(service.id)).length,
              selectedLabel: ctx.t('operatorServicesSelected'),
              title: domain,
              className: 'operator-service-group',
              selectAllLabel: ctx.t('operatorServicesSelectAll'),
              toggleLabel: ctx.t(groupSelected ? 'operatorServicesClearAll' : 'operatorServicesSelectAll'),
              onToggle: () => ctx.toggleOperatorServiceGroup(services.map((service) => service.id), !groupSelected),
              items: services.map((service) => gatewayCheckboxGroupOption(service, selected, serviceGrantCount, ctx)),
            });
          })}
        </div>
      ` : gatewayEmptyState(ctx.t('operatorServicesUnavailable'))}
      `, 'operator-policy-card')}
  `;
}
