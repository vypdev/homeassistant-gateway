import { html, type TemplateResult } from 'lit';
import { gatewayButton, gatewayCard, gatewayCheckboxGroup, gatewayEmptyState, gatewayFormActions, gatewaySelect, gatewayTable, gatewayTabGroup, gatewayTextField } from './ui';
import type { CapabilityProbeReport, Client, OperatorService, Profile } from './models';

type Translator = (key: string) => string;

export type ClientsViewContext = {
  clients: Client[];
  busy: boolean;
  t: Translator;
  refresh: () => void;
  createClient: (event: Event) => void;
  revoke: (clientId: string) => void;
  deleteClient: (clientId: string) => void;
  rotate: (clientId: string) => void;
  editCapabilities: (clientId: string) => void;
  saveCapabilities: () => void;
  cancelCapabilityEdit: () => void;
  editingClientId: string | null;
  probe: (clientId: string) => void;
  probeReport: CapabilityProbeReport | null;
  probeBusy: boolean;
  capabilitySelector: () => TemplateResult;
  operatorEnabled: boolean;
  operatorServices: OperatorService[];
  selectedOperatorServices: readonly string[];
  setOperatorServiceSelection: (services: readonly string[]) => void;
  navigateToPolicy: () => void;
  permissionTab: 'capabilities' | 'operator-services';
  setPermissionTab: (tab: 'capabilities' | 'operator-services') => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
};

export function clientsView(ctx: ClientsViewContext): TemplateResult {
  const globallyEnabled = new Set(ctx.operatorServices.map((service) => service.id));
  const probeRows = ctx.probeReport?.results ?? [];
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
            html`${gatewayButton({ label: ctx.t('probeCapabilities'), variant: 'secondary', disabled: ctx.probeBusy, onClick: () => ctx.probe(client.client_id) })}${client.status === 'active' ? html`${gatewayButton({ label: ctx.t('editCapabilities'), variant: 'secondary', disabled: ctx.busy, onClick: () => ctx.editCapabilities(client.client_id) })}${gatewayButton({ label: ctx.t('revoke'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.revoke(client.client_id) })}${gatewayButton({ label: ctx.t('rotate'), variant: 'secondary', disabled: ctx.busy, onClick: () => ctx.rotate(client.client_id) })}` : gatewayButton({ label: ctx.t('deleteClient'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.deleteClient(client.client_id) })}`,
          ]))}</div>
          <div class="responsive-records" data-testid="clients-responsive-records">
            ${ctx.clients.map((client) => html`<article class="responsive-record" data-testid="client-record">
              <div class="responsive-record-header"><strong>${client.display_name}</strong><span class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</span></div>
              <div class="responsive-field"><span>${ctx.t('clientId')}</span><code>${client.client_id}</code></div>
              <div class="responsive-field"><span>${ctx.t('profile')}</span><span class="tag">${client.profile}</span></div>
              <div class="responsive-field responsive-field-stack"><span>${ctx.t('capabilities')}</span><div class="responsive-values">${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</div></div>
              ${client.profile === 'operator' ? html`<div class="responsive-field responsive-field-stack"><span>${ctx.t('operatorServiceGrants')}</span><code class="responsive-wrap">${client.operator_services.filter((service) => globallyEnabled.has(service)).join(', ') || ctx.t('operatorServicesNoneAvailable')}</code></div>` : ''}
              <div class="responsive-actions">${gatewayButton({ label: ctx.t('probeCapabilities'), variant: 'secondary', disabled: ctx.probeBusy, onClick: () => ctx.probe(client.client_id) })}${client.status === 'active' ? html`${gatewayButton({ label: ctx.t('editCapabilities'), variant: 'secondary', disabled: ctx.busy, onClick: () => ctx.editCapabilities(client.client_id) })}${gatewayButton({ label: ctx.t('revoke'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.revoke(client.client_id) })}${gatewayButton({ label: ctx.t('rotate'), variant: 'secondary', disabled: ctx.busy, onClick: () => ctx.rotate(client.client_id) })}` : gatewayButton({ label: ctx.t('deleteClient'), variant: 'danger', disabled: ctx.busy, onClick: () => ctx.deleteClient(client.client_id) })}</div>
            </article>`)}
          </div>
          ${ctx.probeReport ? html`<section class="capability-probe-panel" aria-live="polite">
            <div class="toolbar"><div><h3>${ctx.t('capabilityProbeTitle')}</h3><p>${ctx.t('capabilityProbeDescription')} · <code>${ctx.probeReport.generated_for}</code></p></div></div>
            <div class="capability-probe-table-wrap"><table class="data-table capability-probe-table"><thead><tr><th>${ctx.t('capability')}</th><th>${ctx.t('tool')}</th><th>${ctx.t('probeStatus')}</th><th>${ctx.t('probeReason')}</th><th>${ctx.t('probeCount')}</th></tr></thead><tbody>
              ${probeRows.map((result) => html`<tr><td><code>${result.capability}</code></td><td><code>${result.tool ?? '—'}</code></td><td><span class=${result.status === 'ok' ? 'ok' : result.status === 'approval_required' ? 'warn' : result.status === 'denied' ? 'bad' : 'muted'}>${result.status}</span></td><td>${result.reason}</td><td>${result.count ?? '—'}</td></tr>`)}
            </tbody></table></div>
          </section>` : ''}
        ` : gatewayEmptyState(ctx.t('noClientsIssued'))}
      `, 'clients-list-card')}
      ${ctx.editingClientId ? gatewayCard(html`
        <h2>${ctx.t('editCapabilities')}</h2>
        <p class="client-form-description">${ctx.t('capabilitiesUpdateWithoutRotation')}</p>
        ${ctx.capabilitySelector()}
        ${gatewayFormActions(html`${gatewayButton({ label: ctx.t('saveCapabilities'), variant: 'primary', disabled: ctx.busy, onClick: ctx.saveCapabilities })}${gatewayButton({ label: ctx.t('cancel'), variant: 'secondary', disabled: ctx.busy, onClick: ctx.cancelCapabilityEdit })}`)}
      `, 'client-capabilities-edit-card') : ''}
      ${gatewayCard(html`
        <h2>${ctx.t('issueObserverClient')}</h2><p class="client-form-description">${ctx.t('tokenShownOnce')}</p>
        <form class="form" @submit=${ctx.createClient}>
          ${gatewayTextField({ label: ctx.t('clientId'), name: 'client_id', maxLength: 128, required: true, placeholder: 'nido-observer' })}
          ${gatewayTextField({ label: ctx.t('displayName'), name: 'display_name', maxLength: 256, required: true, placeholder: 'Nido house monitor' })}
          ${gatewaySelect({ label: ctx.t('profile'), name: 'profile', onInput: (event) => ctx.setProfile((event.target as HTMLSelectElement).value as Profile), options: html`<option value="observer">${ctx.t('readOnly')}</option><option value="operator" ?disabled=${!ctx.operatorEnabled}>operator${ctx.operatorEnabled ? '' : ` · ${ctx.t('operatorDisabledOption')}`}</option>` })}
          ${gatewayTabGroup([
            { id: 'capabilities-tab', label: ctx.t('permissionsCapabilitiesTab'), className: 'permission-tab', selected: ctx.permissionTab === 'capabilities', panelId: 'capabilities-panel', onSelect: () => ctx.setPermissionTab('capabilities') },
            { id: 'operator-services-tab', label: ctx.t('permissionsOperatorServicesTab'), className: 'permission-tab', selected: ctx.permissionTab === 'operator-services', panelId: 'operator-services-panel', onSelect: () => ctx.setPermissionTab('operator-services') },
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
              <p class="muted operator-service-selection-hint">${ctx.t('operatorServicesSelectionHint')}</p>
              ${ctx.operatorServices.length ? gatewayCheckboxGroup({
                name: 'operator_services',
                selectedCount: ctx.selectedOperatorServices.length,
                selectedLabel: ctx.t('operatorServicesSelected'),
                showSelectionCount: false,
                selectAllLabel: ctx.t('operatorServicesSelectAll'),
                clearLabel: ctx.t('operatorServicesClearAll'),
                onSelectAll: () => ctx.setOperatorServiceSelection(ctx.operatorServices.map((service) => service.id)),
                onClear: () => ctx.setOperatorServiceSelection([]),
                items: ctx.operatorServices.map((service) => ({
                  value: service.id,
                  label: service.name,
                  description: html`<span class="mono">${service.id}</span><br>${service.description}`,
                  showValue: false,
                  checked: ctx.selectedOperatorServices.includes(service.id),
                  disabled: !ctx.operatorEnabled,
                  className: 'operator-service-option',
                  onChange: (event: Event) => {
                    const selected = new Set(ctx.selectedOperatorServices);
                    if ((event.target as HTMLInputElement).checked) selected.add(service.id); else selected.delete(service.id);
                    ctx.setOperatorServiceSelection([...selected]);
                  },
                })),
              }) : html`<div class="operator-services-empty" role="note"><span>${ctx.t('operatorServicesNoneAvailable')}</span><button class="link-button" type="button" @click=${ctx.navigateToPolicy}>${ctx.t('operatorServicesOpenPolicy')}</button></div>`}
            </fieldset>
          </section>`}
          ${gatewayFormActions(gatewayButton({ label: ctx.t('issueClient'), variant: 'primary', type: 'submit', disabled: ctx.busy, leadingIcon: '+' }))}
        </form>
      `, 'client-form-card')}
    </div>`;
}
