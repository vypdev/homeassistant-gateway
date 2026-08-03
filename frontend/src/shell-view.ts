import { html, type TemplateResult } from 'lit';

export function neuralBackground(): TemplateResult {
  return html`<div class="dot-field" aria-hidden="true">
    <span class="dot-field__zone dot-field__zone--one"></span>
    <span class="dot-field__zone dot-field__zone--two"></span>
    <span class="dot-field__zone dot-field__zone--three"></span>
  </div>`;
}
