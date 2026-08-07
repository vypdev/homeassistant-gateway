import { html, type TemplateResult } from 'lit';

export function catalogView(): TemplateResult {
  const appPath = window.location.pathname.replace(/\/+$/, '');
  const catalogPath = `${appPath || ''}/catalog/`;
  return html`<section class="catalog-view" aria-label="Component catalog">
    <iframe title="Gateway component catalog" src=${catalogPath} loading="eager"></iframe>
  </section>`;
}