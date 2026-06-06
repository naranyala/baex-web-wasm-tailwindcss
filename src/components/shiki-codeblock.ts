import { BaexElement, defineComponent, html } from '../framework/index.js';
import { property } from '../framework/baex-element.js';
import { highlightCode } from '../framework/highlighter.js';

class ShikiCodeblock extends BaexElement {
  @property({ type: String }) code = '';
  @property({ type: String }) lang = 'typescript';
  @property({ type: String }) highlighted = '';

  onConnected() {
    this._highlight();
  }

  private async _highlight() {
    this.highlighted = await highlightCode(this.code, this.lang);
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="shiki-wrapper overflow-x-auto p-4 rounded-lg bg-[#0d1117] border border-white/10" .innerHTML="${this.highlighted}">
      </div>
    `;
  }
}

defineComponent('baex-shiki-codeblock', ShikiCodeblock);
