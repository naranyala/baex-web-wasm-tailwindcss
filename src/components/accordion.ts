import { BaexElement, defineComponent, html } from '../framework/index.js';
import { property } from '../framework/baex-element.js';

class AccordionItem extends BaexElement {
  @property({ type: String }) title = '';
  @property({ type: Boolean }) open = false;

  render() {
    return html`
      <div class="border border-white/10 rounded-lg mb-2 overflow-hidden bg-white/[0.02]">
        <button 
          class="w-full text-left p-4 bg-white/5 font-semibold transition-colors hover:bg-white/10 flex justify-between items-center"
          @click=${() => this.open = !this.open}
        >
          <span>${this.title}</span>
          <span class="transition-transform duration-200 ${this.open ? 'rotate-180' : ''}">▼</span>
        </button>
        ${this.open ? html`
          <div class="p-4 border-t border-white/10 text-gray-400 text-sm leading-relaxed">
            <slot></slot>
          </div>
        ` : ''}
      </div>
    `;
  }
}

defineComponent('baex-accordion-item', AccordionItem);

