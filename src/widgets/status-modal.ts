import { html, defineComponent, BaexElement, createSignal } from '../framework/index.js';

export const modalOpenSignal = createSignal('modalOpen', false);

class StatusModalElement extends BaexElement {
  static properties = {
    isOpen: { type: Boolean, attribute: false },
  };

  onConnected() {
    this.track(modalOpenSignal, () => this.requestUpdate());
  }

  render() {
    const isOpen = (modalOpenSignal as any).value;
    if (!isOpen) return html``;

    // Simulate retrieving IR state (In a real app, this would query the components)
    const irState = {
      blueprint: 'Static structure (immutable)',
      bindingSet: 'Dynamic mapping (size: ?)',
      nodeMap: 'DOM references',
      patchSet: 'Pending updates'
    };

    return html`
      <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4" @click=${() => (modalOpenSignal as any).value = false}>
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-xl p-6 shadow-2xl" @click=${(e: Event) => e.stopPropagation()}>
          <h2 class="text-xl font-bold mb-4 text-blue-400">BAEX DevTools: IR Inspector</h2>
          
          <div class="grid grid-cols-2 gap-4 text-xs font-mono">
            ${Object.entries(irState).map(([key, value]) => html`
              <div class="p-3 bg-white/5 rounded border border-white/5">
                <h3 class="font-bold text-white/60 uppercase mb-1">${key}</h3>
                <pre class="text-white/80">${value}</pre>
              </div>
            `)}
          </div>
          
          <div class="mt-6 flex justify-end">
            <button @click=${() => (modalOpenSignal as any).value = false} class="px-4 py-2 bg-white/10 rounded text-sm hover:bg-white/20">Close</button>
          </div>
        </div>
      </div>
    `;
  }
}

defineComponent('baex-status-modal', StatusModalElement);
