import { html, defineComponent, BaexElement } from '../framework/index.js';
import { modalOpenSignal } from './status-modal.js';

class StatusFooterElement extends BaexElement {
  render() {
    const primitives = (window as any).baexPrimitives || [];
    const utils = Object.keys((window as any).utils || {});
    
    return html`
      <footer 
        class="fixed bottom-0 left-0 w-full h-6 bg-[#222] text-[#ddd] flex items-center px-2.5 text-[11px] z-[9999] border-t border-[#444] cursor-pointer hover:bg-[#333] transition-colors"
        @click=${() => (modalOpenSignal as any).value = true}
      >
        <span><strong>BAEX API:</strong> ${primitives.length} Primitives | ${utils.length} Utility Functions</span>
      </footer>
    `;
  }
}

defineComponent('baex-status-footer', StatusFooterElement);
