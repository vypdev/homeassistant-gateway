import { html, type TemplateResult } from 'lit';

export function neuralBackground(): TemplateResult {
  return html`<div class="neural" aria-hidden="true"><span class="node" style="left:14%;top:24%"></span><span class="node" style="left:31%;top:12%;animation-delay:1s"></span><span class="node" style="left:52%;top:28%;animation-delay:2s"></span><span class="node" style="left:76%;top:18%;animation-delay:.5s"></span><span class="node" style="left:88%;top:44%;animation-delay:1.7s"></span><span class="node" style="left:24%;top:68%;animation-delay:2.4s"></span><span class="node" style="left:61%;top:74%;animation-delay:1.2s"></span></div>`;
}
