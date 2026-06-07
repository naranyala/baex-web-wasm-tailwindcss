import { html, defineComponent, BaexElement } from '../framework/index.js';
import { modalOpenSignal } from './status-modal.js';

class StatusFooterElement extends BaexElement {
  render() {
    const primitives = (window as any).baexPrimitives || [];
    const utils = Object.keys((window as any).utils || {});
    
    const projectDir = 'baex-web-wasm-tailwindcss';

    return html`
      <footer 
        class="fixed bottom-0 left-0 w-full h-7 bg-[#0a0e17] text-gray-400 flex items-center justify-between px-3 text-[13px] z-[9999] border-t border-white/[0.06] cursor-pointer hover:bg-white/[0.02] transition-colors"
        @click=${() => (modalOpenSignal as any).value = true}
      >
        <span class="font-mono text-white/30">${projectDir}</span>
        <span class="font-mono"><span class="text-blue-400 font-semibold">BAEX</span> ${primitives.length} primitives · ${utils.length} utilities</span>
      </footer>
    `;
  }
}

defineComponent('baex-status-footer', StatusFooterElement);
