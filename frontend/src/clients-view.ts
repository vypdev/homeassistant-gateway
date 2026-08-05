import { html, type TemplateResult } from 'lit';
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
      <div class="card">
        <div class="toolbar">
          <div><h2>${ctx.t('registeredClients')}</h2><p>${ctx.t('tokensNotListed')}</p></div>
          <button class="secondary" @click=${ctx.refresh} ?disabled=${ctx.busy}>${ctx.t('refresh')}</button>
        </div>
        ${ctx.clients.length ? html`
          <div class="table-wrap desktop-only"><table class="clients-table"><thead><tr>
            <th>${ctx.t('identity')}</th><th>${ctx.t('profile')}</th><th>${ctx.t('capabilities')}</th><th>${ctx.t('status')}</th><th></th>
          </tr></thead><tbody>
            ${ctx.clients.map((client) => html`<tr>
              <td><strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span></td>
              <td><span class="tag">${client.profile}</span></td>
              <td>
                ${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}
                ${client.profile === 'operator' ? html`<br><small class="muted">${ctx.t('operatorServiceGrants')}: ${client.operator_services.filter((service) => globallyEnabled.has(service)).length ? client.operator_services.filter((service) => globallyEnabled.has(service)).join(', ') : ctx.t('operatorServicesNoneAvailable')}</small>` : ''}
              </td>
              <td class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</td>
              <td>${client.status === 'active' ? html`
                <button class="danger" @click=${() => ctx.revoke(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('revoke')}</button>
                <button class="secondary" @click=${() => ctx.rotate(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('rotate')}</button>` : html`
                <button class="danger" @click=${() => ctx.deleteClient(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('deleteClient')}</button>`}</td>
            </tr>`)}
          </tbody></table></div>
          <div class="responsive-records" data-testid="clients-responsive-records">
            ${ctx.clients.map((client) => html`<article class="responsive-record" data-testid="client-record">
              <div class="responsive-record-header"><strong>${client.display_name}</strong><span class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</span></div>
              <div class="responsive-field"><span>${ctx.t('clientId')}</span><code>${client.client_id}</code></div>
              <div class="responsive-field"><span>${ctx.t('profile')}</span><span class="tag">${client.profile}</span></div>
              <div class="responsive-field responsive-field-stack"><span>${ctx.t('capabilities')}</span><div class="responsive-values">${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</div></div>
              ${client.profile === 'operator' ? html`<div class="responsive-field responsive-field-stack"><span>${ctx.t('operatorServiceGrants')}</span><code class="responsive-wrap">${client.operator_services.filter((service) => globallyEnabled.has(service)).join(', ') || ctx.t('operatorServicesNoneAvailable')}</code></div>` : ''}
              ${client.status === 'active' ? html`<div class="responsive-actions"><button class="danger" @click=${() => ctx.revoke(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('revoke')}</button><button class="secondary" @click=${() => ctx.rotate(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('rotate')}</button></div>` : html`<div class="responsive-actions"><button class="danger" @click=${() => ctx.deleteClient(client.client_id)} ?disabled=${ctx.busy}>${ctx.t('deleteClient')}</button></div>`}
            </article>`)}
          </div>` : html`<div class="empty">${ctx.t('noClientsIssued')}</div>`}
      </div>
      <div class="card">
        <h2>${ctx.t('issueObserverClient')}</h2><p style="margin-bottom:16px">${ctx.t('tokenShownOnce')}</p>
        <form class="form" @submit=${ctx.createClient}>
          <label>${ctx.t('clientId')}<input name="client_id" required maxlength="128" placeholder="nido-observer" /></label>
          <label>${ctx.t('displayName')}<input name="display_name" required maxlength="256" placeholder="Nido house monitor" /></label>
          <label>${ctx.t('profile')}<select name="profile" @change=${(event: Event) => ctx.setProfile((event.target as HTMLSelectElement).value as Profile)}>
            <option value="observer">${ctx.t('readOnly')}</option>
            <option value="operator" ?disabled=${!ctx.operatorEnabled}>operator${ctx.operatorEnabled ? '' : ` · ${ctx.t('operatorDisabledOption')}`}</option>
          </select></label>
          <div class="permission-tabs" role="tablist" aria-label=${ctx.t('permissionsCapabilitiesTab')}>
            <button id="capabilities-tab" type="button" class="permission-tab" role="tab" aria-controls="capabilities-panel" aria-selected=${ctx.permissionTab === 'capabilities'} @click=${() => ctx.setPermissionTab('capabilities')}>${ctx.t('permissionsCapabilitiesTab')}</button>
            <button id="operator-services-tab" type="button" class="permission-tab" role="tab" aria-controls="operator-services-panel" aria-selected=${ctx.permissionTab === 'operator-services'} @click=${() => ctx.setPermissionTab('operator-services')}>${ctx.t('permissionsOperatorServicesTab')}</button>
          </div>
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
                  <button type="button" class="secondary" @click=${(event: Event) => setOperatorServiceSelection(event, true)}>${ctx.t('operatorServicesSelectAll')}</button>
                  <button type="button" class="secondary" @click=${(event: Event) => setOperatorServiceSelection(event, false)}>${ctx.t('operatorServicesClearAll')}</button>
                </span>
              </div>
              <div class="operator-service-list">${ctx.operatorServices.map((service) => html`<label class="check-row operator-service-option">
                <input type="checkbox" name="operator_services" value=${service.id} ?disabled=${!ctx.operatorEnabled} />
                <span><strong>${service.name}</strong> · <span class="mono">${service.id}</span><br><small>${service.description}</small></span>
              </label>`)}</div>` : html`<div class="operator-services-empty" role="note"><span>${ctx.t('operatorServicesNoneAvailable')}</span><button class="link-button" type="button" @click=${ctx.navigateToPolicy}>${ctx.t('operatorServicesOpenPolicy')}</button></div>`}
            </fieldset>
          </section>`}
          <div class="form-actions"><button class="primary" ?disabled=${ctx.busy}><span class="button-leading-icon" aria-hidden="true">+</span>${ctx.t('issueClient')}</button></div>
        </form>
      </div>
    </div>`;
}
