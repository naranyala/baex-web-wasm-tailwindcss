import { BaexElement, defineComponent, html, createSignal, Signal } from '../framework/index.js';

interface AccordionItem {
  id: string;
  title: string;
  content: string;
  icon: string;
}

const ACCORDION_DATA: AccordionItem[] = [
  { 
    id: 'sec1', 
    title: 'Framework Architecture', 
    icon: '🏗️', 
    content: 'Baex is built on a JS-WASM bridge. The template engine and reconciliation logic are implemented in Rust for maximum performance, while the API surface remains idiomatic JavaScript. It uses a Signal-based reactivity system similar to SolidJS or Preact.' 
  },
  { 
    id: 'sec2', 
    title: 'Signal Reactivity', 
    icon: '📡', 
    content: 'Signals allow for fine-grained updates. Instead of re-rendering the whole component tree, only the specific DOM nodes bound to a changed signal are updated. This minimizes DOM operations and maximizes frame rates.' 
  },
  { 
    id: 'sec3', 
    title: 'WASM Bridge', 
    icon: '🌉', 
    content: 'The bridge uses a highly optimized serialization format to pass data between the JS heap and WASM memory. It handles property updates and event propagation with minimal overhead, ensuring that the UI thread remains responsive.' 
  },
  { 
    id: 'sec4', 
    title: 'Getting Started', 
    icon: '🚀', 
    content: 'To build a component, extend BaexElement, define your signals, and implement the render() method using the html tagged template. Register your component with defineComponent() to make it available in the DOM.' 
  },
];

export class Accordion extends BaexElement {
  private _activeId!: Signal<string | null>;

  constructor() {
    super();
    this._activeId = createSignal('accordion_active', null, this._cid);
  }

  onConnected() {
    this.track(this._activeId, () => this.requestUpdate());
  }

  private _toggle = (id: string) => {
    this._activeId.value = this._activeId.value === id ? null : id;
  };

  render() {
    const activeId = this._activeId.value;

    return html`
      <div class="max-w-2xl mx-auto space-y-3">
        <div class="text-center mb-8">
          <h3 class="text-2xl font-bold text-white">Framework FAQ</h3>
          <p class="text-gray-400 text-sm">Learn more about the Baex internals</p>
        </div>
        
        ${ACCORDION_DATA.map((item) => {
          const isOpen = activeId === item.id;
          return html`
            <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-all duration-300 ${isOpen ? 'border-blue-500/30 bg-white/[0.05]' : ''}">
              <button 
                @click=${() => this._toggle(item.id)}
                class="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">${item.icon}</span>
                  <span class="text-sm font-bold text-white/90">${item.title}</span>
                </div>
                <span class="text-white/30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </span>
              </button>
              
              <div class="grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}" style="transition-property: grid-template-rows, opacity;">
                <div class="overflow-hidden">
                  <div class="p-5 pt-0 text-sm text-gray-400 leading-relaxed border-t border-white/[0.04] mt-[-1px] pt-4">
                    ${item.content}
                  </div>
                </div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}

defineComponent('baex-accordion', Accordion);
