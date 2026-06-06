import { BaexElement, defineComponent, html } from '../framework/index.js';
import { property } from '../framework/baex-element.js';

class AccordionItem extends BaexElement {
  @property({ type: String }) title = '';
  @property({ type: Boolean }) open = false;

  render() {
    return html`
      <div class="border border-white/10 rounded-lg mb-2 overflow-hidden">
        <button 
          class="w-full text-left p-4 bg-white/5 font-semibold"
          @click=${() => this.open = !this.open}
        >
          ${this.title} ${this.open ? '▼' : '▶'}
        </button>
        ${this.open ? html`<div class="p-4 bg-black/20"><slot></slot></div>` : ''}
      </div>
    `;
  }
}

defineComponent('baex-accordion-item', AccordionItem);
