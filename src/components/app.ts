
import { BaexElement, defineComponent, html } from '../framework/index.js';
import { Raw, when } from '../framework/template.js';
import { BaexCodeBlock } from './code-block.js';
import './accordion.js';
import './shiki-codeblock.js';
import './leaflet-map.js';
import { viewSignal } from './nav.js';

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
          <div
            class="accordion-body"
            data-acc-body="${idx}"
          >
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

    return html`
      <div class="flex flex-row min-h-screen">
        <aside class="w-64 border-r border-white/10 p-6 pt-10 bg-[#020917]/50">
          <h1 class="text-lg font-bold text-white mb-8 cursor-pointer" @click=${() => this._setView('home')}>BAEX Docs</h1>
          <div class="flex flex-col gap-2">
            ${MENU_CATEGORIES.map((item) => html`
              <button
                @click=${() => this._setView(item.id)}
                class="flex items-center gap-3 text-sm text-left p-3 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-all w-full"
              >
                <span class="w-2 h-2 rounded-full bg-${item.color}-400"></span>
                ${item.name}
              </button>
            `)}
          </div>
        </aside>

        <main class="flex-1 p-10">
          ${when(
            this.view === 'home',
            html`
              <div class="max-w-5xl">
                <h2 class="text-3xl font-bold mb-8 text-white">Dashboard</h2>
                <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h3 class="font-semibold text-white mb-2">Welcome</h3>
                  <p class="text-sm text-white/50">Select "Accordion Components" from the sidebar.</p>
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
                                html`
                                  <div class="max-w-4xl">
                                    <div class="text-[1.1rem] font-bold text-white/80 mb-3 pb-2 border-b border-white/10">${this.view}</div>
                                    <p class="text-sm text-white/50 mb-4">Documentation for ${this.view}.</p>
                                  </div>
                                `
                              )
                            )
                          )
                        )}
                      </main>
                    </div>
                  `;
                }
              }

              defineComponent('baex-app', AppElement);
