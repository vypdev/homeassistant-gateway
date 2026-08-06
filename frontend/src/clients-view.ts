import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayCard, gatewayCheckbox, gatewayEmptyState, gatewayFormActions, gatewaySelect, gatewayTable, gatewayTabGroup, gatewayTextField } from './ui';
import type { Client, OperatorService, Profile } from './models';

type Translator = (key: string) => string;

function setOperatorServiceSelection(event: Event, checked: boolean) {
  event.preventDefault();
  const form = (event.currentTarget as HTMLElement).closest('form');
  form?.querySelectorAll<HTMLInputElement>('input[name="operator_services"]').forEach((input) => {
    input.checked = checked;
  });
}

export type ClientsViewContext = {
  clients: Client[];
  busy: boolean;
  t: Translator;
  refresh: () => void;
  createClient: (event: Event) => void;
  revoke: (clientId: string) => void;
  deleteClient: (clientId: string) => void;
  rotate: (clientId: string) => void;
  capabilitySelector: () => TemplateResult;
  operatorEnabled: boolean;
  operatorServices: OperatorService[];
  navigateToPolicy: () => void;
  permissionTab: 'capabilities' | 'operator-services';
  setPermissionTab: (tab: 'capabilities' | 'operator-services') => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
};

export function clientsView(ctx: ClientsViewContext): TemplateResult {
  const globallyEnabled = new Set(ctx.operatorServices.map((service) => service.id));
  return html`
    <div class="split">
      ${gatewayCard(html`
        <div class="toolbar">
          <div><h2>${ctx.t('registeredClients')}</h2><p>${ctx.t('tokensNotListed')}</p></div>
          ${gatewayButton({ label: ctx.t('refresh'), variant: 'secondary', disabled: ctx.busy, onClick: ctx.refresh })}
        </div>
        ${ctx.clients.length ? html`
          <div class="table-wrap desktop-only">${gatewayTable([ctx.t('identity'), ctx.t('profile'), ctx.t('capabilities'), ctx.t('status'), ''], ctx.clients.map((client) => [
            html`<strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span>`,
            html`<span class="tag">${client.profile}</span>`,
            html`${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}${client.profile === 'operator' ? html`<br><small class="muted">${ctx.t('operatorServiceGrants')}: ${client.operator_services.filter((service) => globallyEnabled.has(service)).length ? client.operator_services.filter((service) => globallyEnabled.has(service)).join(', ') : ctx.t('operatorServicesNoneAvailable')}</small>` : ''}`,
            html`<span class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</span>`,
            client.status === 'active' ? html`${gatewayButton({ label: ctx.t('revoke'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.revoke(client.client_id) })}${gatewayButton({ label: ctx.t('rotate'), variant: 'secondary', disabled: ctx.busy, onClick: () => ctx.rotate(client.client_id) })}` : gatewayButton({ label: ctx.t('deleteClient'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.deleteClient(client.client_id) }),
          ]))}</div>
          <div class="responsive-records" data-testid="clients-responsive-records">
            ${ctx.clients.map((client) => html`<article class="responsive-record" data-testid="client-record">
              <div class="responsive-record-header"><strong>${client.display_name}</strong><span class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</span></div>
              <div class="responsive-field"><span>${ctx.t('clientId')}</span><code>${client.client_id}</code></div>
              <div class="responsive-field"><span>${ctx.t('profile')}</span><span class="tag">${client.profile}</span></div>
              <div class="responsive-field responsive-field-stack"><span>${ctx.t('capabilities')}</span><div class="responsive-values">${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</div></div>
              ${client.profile === 'operator' ? html`<div class="responsive-field responsive-field-stack"><span>${ctx.t('operatorServiceGrants')}</span><code class="responsive-wrap">${client.operator_services.filter((service) => globallyEnabled.has(service)).join(', ') || ctx.t('operatorServicesNoneAvailable')}</code></div>` : ''}
              ${client.status === 'active' ? html`<div class="responsive-actions">${gatewayButton({ label: ctx.t('revoke'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.revoke(client.client_id) })}${gatewayButton({ label: ctx.t('rotate'), variant: 'secondary', disabled: ctx.busy, onClick: () => ctx.rotate(client.client_id) })}</div>` : html`<div class="responsive-actions">${gatewayButton({ label: ctx.t('deleteClient'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.deleteClient(client.client_id) })}</div>`}
            </article>`)}
          </div>` : gatewayEmptyState(ctx.t('noClientsIssued'))}
      `, 'clients-list-card')}
      ${gatewayCard(html`
        <h2>${ctx.t('issueObserverClient')}</h2><p class="client-form-description">${ctx.t('tokenShownOnce')}</p>
        <form class="form" @submit=${ctx.createClient}>
          ${gatewayTextField({ label: ctx.t('clientId'), name: 'client_id', maxLength: 128, required: true, placeholder: 'nido-observer' })}
          ${gatewayTextField({ label: ctx.t('displayName'), name: 'display_name', maxLength: 256, required: true, placeholder: 'Nido house monitor' })}
          ${gatewaySelect({ label: ctx.t('profile'), name: 'profile', onInput: (event) => ctx.setProfile((event.target as HTMLSelectElement).value as Profile), options: html`<option value="observer">${ctx.t('readOnly')}</option><option value="operator" ?disabled=${!ctx.operatorEnabled}>operator${ctx.operatorEnabled ? '' : ` · ${ctx.t('operatorDisabledOption')}`}</option>` })}
          ${gatewayTabGroup([
            { id: 'capabilities-tab', label: ctx.t('permissionsCapabilitiesTab'), selected: ctx.permissionTab === 'capabilities', panelId: 'capabilities-panel', onSelect: () => ctx.setPermissionTab('capabilities') },
            { id: 'operator-services-tab', label: ctx.t('permissionsOperatorServicesTab'), selected: ctx.permissionTab === 'operator-services', panelId: 'operator-services-panel', onSelect: () => ctx.setPermissionTab('operator-services') },
          ], ctx.t('permissionsCapabilitiesTab'), 'permission-tabs')}
          ${ctx.permissionTab === 'capabilities' ? html`<section id="capabilities-panel" class="permission-panel" role="tabpanel" aria-labelledby="capabilities-tab">
            <p class="permission-panel-description">${ctx.t('permissionsCapabilitiesDescription')}</p>
            ${ctx.profile === 'observer' ? html`<p class="permission-disabled-note" role="note">${ctx.t('permissionsObserverWriteDisabled')}</p>` : ''}
            ${ctx.capabilitySelector()}
          </section>` : html`<section id="operator-services-panel" class="permission-panel" role="tabpanel" aria-labelledby="operator-services-tab">
            <p class="permission-panel-description">${ctx.t('permissionsOperatorServicesDescription')}</p>
            <fieldset class="form capability-option operator operator-service-fieldset">
              <legend>${ctx.t('operatorServiceGrants')}</legend>
              <small class="muted">${ctx.t('operatorServiceGrantDescription')}</small>
              ${ctx.operatorServices.length ? html`<div class="operator-service-selection-toolbar">
                <span class="muted">${ctx.t('operatorServicesSelectionHint')}</span>
                <span class="operator-service-selection-actions">
                  ${gatewayButton({ label: ctx.t('operatorServicesSelectAll'), variant: 'secondary', onClick: (event) => setOperatorServiceSelection(event, true) })}
                  ${gatewayButton({ label: ctx.t('operatorServicesClearAll'), variant: 'secondary', onClick: (event) => setOperatorServiceSelection(event, false) })}
                </span>
              </div>
              <div class="operator-service-list">${ctx.operatorServices.map((service) => gatewayCheckbox({
                name: 'operator_services',
                value: service.id,
                disabled: !ctx.operatorEnabled,
                className: 'check-row operator-service-option',
                label: html`<strong>${service.name}</strong> · <span class="mono">${service.id}</span><br><small>${service.description}</small>`,
              }))}</div>` : html`<div class="operator-services-empty" role="note"><span>${ctx.t('operatorServicesNoneAvailable')}</span><button class="link-button" type="button" @click=${ctx.navigateToPolicy}>${ctx.t('operatorServicesOpenPolicy')}</button></div>`}
            </fieldset>
          </section>`}
          ${gatewayFormActions(gatewayButton({ label: ctx.t('issueClient'), variant: 'primary', type: 'submit', disabled: ctx.busy, leadingIcon: '+' }))}
        </form>
      `, 'client-form-card')}
    </div>`;
}
