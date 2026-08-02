import { html, type TemplateResult } from 'lit';
import type { View } from './models';

type Translator = (key: string) => string;
type Navigate = (view: View) => void;

export function navigationView(current: View, translate: Translator, navigate: Navigate): TemplateResult {
  const items: Array<[View, string, string]> = [
    ['overview', '◈', 'overview'],
    ['development', '⚗', 'development'],
    ['clients', '◎', 'clients'],
    ['policy', '◇', 'policy'],
    ['mcp', '⌁', 'mcp'],
    ['audit', '◌', 'audit'],
  ];
  return html`<nav aria-label=${translate('navigation')}>${items.map(([view, icon, key]) => html`<button class=${current === view ? 'active' : ''} @click=${() => navigate(view)}><span aria-hidden="true">${icon}</span> ${translate(key)}</button>`)}</nav>`;
}
