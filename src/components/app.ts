
import { BaexElement, defineComponent, html } from '../framework/index.js';
import { Raw, when } from '../framework/template.js';
import { BaexCodeBlock } from './code-block.js';
import './accordion.js';
import './shiki-codeblock.js';
import './leaflet-map.js';
import './tree-view.js';
import './tree-item.js';
import './rag-menu.js';
import { viewSignal } from './nav.js';
import { useSignal } from '../framework/index.js';

const FunctionalCounter = () => {
  const count = useSignal('func-count', 0);
  return html`
    <div class="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
      <p class="text-sm text-gray-400 mb-2">Functional Component</p>
      <div class="text-2xl font-bold mb-4">${count.value}</div>
      <button 
        @click=${() => count.value++} 
        class="px-4 py-2 bg-blue-500 text-white rounded-md text-xs"
      >
        Increment
      </button>
    </div>
  `;
};

defineComponent('baex-code-block', BaexCodeBlock);

interface ApiItem {
  name: string;
  signature: string;
  desc: string;
  group: 'wasm' | 'framework';
  code?: string;
  lang?: string;
}

const API_ITEMS: ApiItem[] = [
  {
    group: 'wasm',
    name: 'blablabla',
    signature: 'blablabla(name: string): string',
    desc: 'Calls the Rust `greet()` function — returns "Hello, {name}! from Rust"',
    code: "window.blablabla('World') // → Hello, World! from Rust",
    lang: 'javascript',
  },
  {
    group: 'wasm',
    name: 'add_numbers',
    signature: 'add_numbers(a: number, b: number): number',
    desc: 'Calls the Rust `add()` function — performs integer addition in WASM',
    code: 'window.add_numbers(3, 4) // → 7',
    lang: 'javascript',
  },
  {
    group: 'wasm',
    name: 'createSignal',
    signature: 'createSignal(key: string, initial: any): any',
    desc: 'Creates a named reactive value in the WASM global signal store.',
    code: "window.createSignal('count', 0) // → 0",
    lang: 'javascript',
  },
  {
    group: 'wasm',
    name: 'setSignal',
    signature: 'setSignal(key: string, value: any): void',
    desc: 'Updates a signal value in the WASM store and notifies all JS subscribers.',
    code: "window.setSignal('count', 42)",
    lang: 'javascript',
  },
  {
    group: 'wasm',
    name: 'getSignal',
    signature: 'getSignal(key: string): any',
    desc: 'Reads the current value of a signal from the WASM store.',
    code: 'window.getSignal("count") // → 42',
    lang: 'javascript',
  },
  {
    group: 'wasm',
    name: 'onSignalChange',
    signature: 'onSignalChange(key: string, callback: Function): void',
    desc: 'Subscribes a JS callback to fire whenever the given signal value changes.',
    code: 'window.onSignalChange("count", (v) => console.log(v))',
    lang: 'javascript',
  },
  {
    group: 'wasm',
    name: 'create_component',
    signature: 'create_component(tag: string, template: string): void',
    desc: 'Defines a custom element via JS eval that renders the given HTML template in its shadow DOM.',
    code: "window.create_component('my-el', '<p>Hello</p>')",
    lang: 'javascript',
  },
  {
    group: 'framework',
    name: 'BaexElement',
    signature: 'abstract class BaexElement extends HTMLElement',
    desc: 'Base class for all BAEX components. Provides reactive properties, light DOM rendering, batched updates via `requestUpdate()`, and lifecycle hooks.',
    code: `class MyEl extends BaexElement {
  static properties = { name: { type: String } }
  name = 'World'
  render() { return html\`<p>Hello \${this.name}</p>\` }
}`,
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'html',
    signature: 'html(strings, ...values): TemplateResult',
    desc: 'Tagged template literal that returns a `TemplateResult` with the rendered HTML string and a list of bindings (@event, .property, ?boolean).',
    code: 'html`<button @click={handler}>Click</button>`',
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'css',
    signature: 'css(strings, ...values): string',
    desc: 'Tagged template literal for defining scoped CSS styles as a plain string.',
    code: 'css`:host { color: hotpink; }`',
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'Signal<T>',
    signature: 'class Signal<T>',
    desc: 'Reactive value container with `.value` getter/setter and `.subscribe()` for change notifications.',
    code: `const s = new Signal('key', 0)
s.subscribe(v => console.log(v))
s.value = 1 // logs 1`,
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'createSignal / getSignal',
    signature: 'createSignal<T>(key, initial): Signal<T>',
    desc: 'Factory functions that create and retrieve named Signal instances from a global JS cache.',
    code: 'const count = createSignal<number>(null, 0)',
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'defineComponent',
    signature: 'defineComponent(tag: string, cls: typeof BaexElement): void',
    desc: 'Wraps `customElements.define()` with a duplicate guard.',
    code: "defineComponent('x-foo', FooElement)",
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'property / state',
    signature:
      'property(decl?): PropertyDecorator / state(): PropertyDecorator',
    desc: 'Decorators that declare reactive properties. `property()` maps to an attribute; `state()` sets `attribute: false`.',
    code: `@property({ type: Number }) count = 0
@state() internal = 'private'`,
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'TemplateResult / Binding',
    signature: 'TemplateResult { html: string; bindings: Binding[] }',
    desc: 'Return type of `html`. Contains rendered HTML string and a discriminated union of bindings.',
    code: '',
    lang: 'typescript',
  },
  {
    group: 'framework',
    name: 'requestUpdate',
    signature: 'requestUpdate(): void',
    desc: 'Schedules a microtask-batched re-render. All reactive property setters call this automatically.',
    code: 'this.requestUpdate() // triggers render() on next microtask',
    lang: 'typescript',
  },
];

const WASM_ITEMS = API_ITEMS.filter((i) => i.group === 'wasm');
const FRAMEWORK_ITEMS = API_ITEMS.filter((i) => i.group === 'framework');

const MENU_CATEGORIES = [
  { id: 'accordion', name: 'Accordion Components', color: 'purple' },
  { id: 'codeblock', name: 'Codeblock Demo', color: 'orange' },
  { id: 'leaflet', name: 'Leaflet Demos', color: 'green' },
  { id: 'treeview', name: 'Tree View Demo', color: 'blue' },
  { id: 'rag', name: 'RAG System', color: 'red' },
];

export class AppElement extends BaexElement {
  static properties = {
    view: { type: String },
  };

  view = 'home';

  onConnected() {
    this.track(viewSignal, (val) => {
      this.view = val as string;
      this.requestUpdate(true);
    });
  }

  private _setView = (view: string) => {
    viewSignal.value = view;
  };

  render() {
    const renderItem = (item: ApiItem, idx: number) => {
      const escapedCode = item.code ? item.code.replace(/"/g, '&quot;') : '';
      const escapedLang = item.lang ? item.lang.replace(/"/g, '&quot;') : '';
      return html`
        <div class="rounded-lg mb-1.5 bg-white/[0.03] border border-white/[0.06]">
          <button
            class="flex items-center gap-3 w-full px-4 py-3 bg-transparent border-none text-inherit font-inherit cursor-pointer text-left transition-colors duration-150 hover:bg-white/[0.05] data-[open=true]:bg-white/[0.06]"
            data-acc-header="${idx}"
            data-open="false"
          >
            <span class="font-semibold text-[0.95rem] whitespace-nowrap">${item.name}</span>
            <span class="text-[0.75rem] opacity-45 truncate flex-1 min-w-0">${item.signature}</span>
            <span class="chevron text-[0.75rem] opacity-50 shrink-0 transition-transform duration-200">▸</span>
          </button>
          <div class="accordion-body" data-acc-body="${idx}">
            <div class="overflow-hidden">
              <div class="px-4 py-4">
                <p class="text-[0.9rem] leading-relaxed opacity-80 mb-3">${item.desc}</p>
                ${
                  item.code
                    ? Raw(
                        `<baex-code-block code="${escapedCode}" lang="${escapedLang}"></baex-code-block>`,
                      )
                    : ''
                }
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const primitives = (window as any).baexPrimitives || [];
    const wasmCount = WASM_ITEMS.length;
    const fwCount = FRAMEWORK_ITEMS.length;
    const demoCount = MENU_CATEGORIES.length;

    return html`
      <div class="min-h-screen bg-[#020917]">

        <div class="flex">
          <aside class="w-64 fixed left-0 top-0 bottom-0 border-r border-white/[0.06] bg-[#0a0e17] overflow-y-auto z-40">
            <div class="px-5 pt-6 pb-4">
              <h1 class="text-lg font-bold text-white tracking-tight cursor-pointer select-none" @click=${() => this._setView('home')}>BAEX</h1>
              <p class="text-[11px] text-gray-500 mt-0.5 tracking-wide">Documentation &amp; Demos</p>
            </div>

            <div class="mx-4 h-px bg-white/[0.06]"></div>

            <div class="px-5 pt-4 pb-1">
              <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Demos</p>
            </div>
            <nav class="px-3 pb-3 space-y-0.5">
              ${MENU_CATEGORIES.map(
                (item) => html`
                  <button
                    @click=${() => this._setView(item.id)}
                    class="flex items-center gap-3 w-full text-sm text-left py-2.5 pl-3 pr-3 rounded-lg transition-all duration-200 border-l-2 ${
                      this.view === item.id
                        ? 'bg-blue-500/10 text-white border-blue-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border-transparent'
                    }"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-${item.color}-400 ${this
                        .view === item.id
                        ? ''
                        : 'opacity-40'} shrink-0"
                    ></span>
                    <span>${item.name}</span>
                  </button>
                `,
              )}
            </nav>

            <div class="mx-4 h-px bg-white/[0.06]"></div>

            <div class="px-5 pt-4 pb-1">
              <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">API</p>
            </div>
            <div class="px-3 pb-6 space-y-0.5">
              <div class="flex items-center gap-3 w-full py-2.5 pl-3 pr-3 rounded-lg text-gray-500 border-l-2 border-transparent">
                <span class="text-[10px] font-mono text-gray-600 font-semibold">WASM</span>
                <span class="text-sm">${wasmCount} primitives</span>
              </div>
              <div class="flex items-center gap-3 w-full py-2.5 pl-3 pr-3 rounded-lg text-gray-500 border-l-2 border-transparent">
                <span class="text-[10px] font-mono text-gray-600 font-semibold">TS</span>
                <span class="text-sm">${fwCount} APIs</span>
              </div>
            </div>
          </aside>

          <main class="flex-1 ml-64 p-8 min-h-[calc(100vh-4rem)]">
            ${when(
              this.view === 'home',
              html`
                <div class="max-w-4xl">
                  <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border border-blue-500/20 p-8 mb-8">
                    <div class="relative z-10">
                      <h2 class="text-2xl font-bold text-white mb-2">Welcome to BAEX</h2>
                      <p class="text-gray-400 max-w-xl leading-relaxed text-sm">A lightweight reactive UI framework powered by WebAssembly. Build fast, reactive web applications with Rust and TypeScript.</p>
                    </div>
                  </div>

                    <div class="grid grid-cols-3 gap-4 mb-8">
                      <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                        <p class="text-2xl font-bold text-blue-400 mb-1">${wasmCount + fwCount}</p>
                        <p class="text-xs text-gray-500">API Primitives</p>
                      </div>
                      <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                        <p class="text-2xl font-bold text-purple-400 mb-1">${demoCount}</p>
                        <p class="text-xs text-gray-500">Interactive Demos</p>
                      </div>
                      <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                        <p class="text-2xl font-bold text-green-400 mb-1">${primitives.length}</p>
                        <p class="text-xs text-gray-500">WASM Exports</p>
                      </div>
                    </div>
                    <div class="mb-8">
                      ${FunctionalCounter()}
                    </div>
                    <div>
                      <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Explore</p>
                    <div class="grid grid-cols-3 gap-4">
                      ${MENU_CATEGORIES.map(
                        (item) => html`
                          <button
                            @click=${() => this._setView(item.id)}
                            class="text-left rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group cursor-pointer"
                          >
                            <div
                              class="w-8 h-8 rounded-lg bg-${item.color}-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                            >
                              <span class="w-2 h-2 rounded-full bg-${item.color}-400"></span>
                            </div>
                            <p class="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                              ${item.name}
                            </p>
                          </button>
                        `,
                      )}
                    </div>
                  </div>
                </div>
              `,
              when(
                this.view === 'accordion',
                html`
                  <div class="max-w-4xl">
                    <div class="text-[1.1rem] font-bold text-purple-400 mb-6 pb-2 border-b border-white/10">Accordion Demo</div>
                    <div class="space-y-4 mb-8">
                      <baex-accordion-item title="Section 1">Content for section 1</baex-accordion-item>
                      <baex-accordion-item title="Section 2">Content for section 2</baex-accordion-item>
                    </div>
                  </div>
                `,
                when(
                  this.view === 'codeblock',
                  html`
                    <div class="max-w-4xl">
                      <div class="text-[1.1rem] font-bold text-orange-400 mb-6 pb-2 border-b border-white/10">Shiki Code Highlighting</div>
                      <baex-shiki-codeblock
                        lang="typescript"
                        code="function helloWorld() {
                                console.log('Hello from Shiki!');
                                return { success: true };
                                }"></baex-shiki-codeblock>
                    </div>
                  `,
                  when(
                    this.view === 'leaflet',
                    html`
                      <div class="max-w-6xl">
                        <div class="text-[1.1rem] font-bold text-green-400 mb-6 pb-2 border-b border-white/10">Leaflet Map Demos</div>
                        <div class="grid grid-cols-2 gap-6">
                          <baex-leaflet-map center="51.505, -0.09" zoom="13"></baex-leaflet-map>
                          <baex-leaflet-map center="48.8566, 2.3522" zoom="12"></baex-leaflet-map>
                          <baex-leaflet-map center="34.0522, -118.2437" zoom="10"></baex-leaflet-map>
                          <baex-leaflet-map center="35.6762, 139.6503" zoom="11"></baex-leaflet-map>
                        </div>
                      </div>
                    `,
                    when(
                      this.view === 'treeview',
                      html`
                        <div class="max-w-4xl">
                          <div class="text-[1.1rem] font-bold text-blue-400 mb-6 pb-2 border-b border-white/10">Tree View Demo</div>
                          <baex-tree-view 
                            data='[
                              { "label": "src", "type": "folder", "children": [
                                { "label": "framework", "type": "folder", "children": [
                                  { "label": "index.ts", "type": "file" },
                                  { "label": "template.ts", "type": "file" }
                                ]},
                                { "label": "components", "type": "folder", "children": [
                                  { "label": "app.ts", "type": "file" },
                                  { "label": "accordion.ts", "type": "file" }
                                ]}
                              ] },
                              { "label": "package.json", "type": "file" }
                            ]'
                          ></baex-tree-view>
                        </div>
                      `,
                      when(
                        this.view === 'rag',
                        html`
                          <baex-rag-menu></baex-rag-menu>
                        `,
                        html`
                          <div class="max-w-4xl">
                            <div class="text-[1.1rem] font-bold text-white/80 mb-3 pb-2 border-b border-white/10">${this.view}</div>
                            <p class="text-sm text-white/50 mb-4">Documentation for ${this.view}.</p>
                          </div>
                        `
                      )
                    )
                  ),
                ),
              ),
            )}
          </main>
        </div>
      </div>
    `;
  }
}

defineComponent('baex-app', AppElement);
