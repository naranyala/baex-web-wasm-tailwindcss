import { BaexElement, defineComponent, html } from '../framework/index.js';
import { Raw, when } from '../framework/template.js';
import { BaexCodeBlock } from './code-block.js';
import { BaexNav, tabsSignal, viewSignal } from './nav.js';

defineComponent('baex-code-block', BaexCodeBlock);
defineComponent('baex-nav', BaexNav);

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

export class AppElement extends BaexElement {
  static properties = {
    view: { type: String },
  };
  static state = {
    searchQuery: { type: String },
  };
  view = 'home';
  searchQuery = '';
  private _copyTimer: number | null = null;

  onConnected() {
    this.addEventListener('click', this._handleClick);
    this.addEventListener('input', this._handleInput);
    this.track(viewSignal, (val) => {
      this.view = val as string;
      this.requestUpdate(true);
    });

    if (!document.querySelector('baex-nav')) {
      const nav = document.createElement('baex-nav');
      document.body.appendChild(nav);
    }
  }

  private _openTab = (id: string, name: string) => {
    const currentTabs = tabsSignal.value as { id: string; name: string }[];
    if (!currentTabs.find((t) => t.id === id)) {
      tabsSignal.value = [...currentTabs, { id, name }];
    }
    viewSignal.value = id;
  };

  onDisconnected() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('input', this._handleInput);
    if (this._copyTimer !== null) {
      clearTimeout(this._copyTimer);
      this._copyTimer = null;
    }
  }

  private _handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.matches('[data-search]')) {
      this.searchQuery = target.value.toLowerCase();
    }
  };

  private _fuzzyMatch = (str: string, query: string): boolean => {
    if (!query) return true;
    return str.toLowerCase().includes(query);
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
      <div class="flex flex-col items-center min-h-screen px-4 py-8">
        <div class="w-full max-w-2xl mt-24">
          <h1 class="text-3xl font-bold text-center mb-1">Wasm Browser API Extended</h1>
          <p class="text-[1.1rem] text-center text-white/60 mt-0 mb-6">BAEX framework × Rust/Wasm</p>

          ${when(
            this.view === 'home',
            html`
              <div class="mt-6">
                <div class="relative mb-6">
                  <input 
                    data-search
                    type="text" 
                    placeholder="Search features..." 
                    class="w-full px-4 py-3 pl-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                  />
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${[
                    {
                      id: 'wasm',
                      name: 'Wasm Primitives',
                      desc: 'Raw functions exposed by the Rust/WASM web-core module.',
                      color: 'amber',
                    },
                    {
                      id: 'framework',
                      name: 'Framework Primitives',
                      desc: 'BAEX (Browser API Extended) framework built on top of WASM.',
                      color: 'blue',
                    },
                    {
                      id: 'props',
                      name: 'Reactive Properties',
                      desc: 'High-performance reactive state with fine-grained updates.',
                      color: 'green',
                    },
                    {
                      id: 'elements',
                      name: 'Custom Elements',
                      desc: 'Extend HTMLElement with the BaexElement base class.',
                      color: 'purple',
                    },
                    {
                      id: 'templates',
                      name: 'Template Engine',
                      desc: 'Tagged template literals with HTML auto-escaping.',
                      color: 'pink',
                    },
                    {
                      id: 'signals',
                      name: 'Signal API',
                      desc: 'Global reactive value store bridged with Rust.',
                      color: 'cyan',
                    },
                  ]
                    .filter((item) =>
                      this._fuzzyMatch(item.name + item.desc, this.searchQuery),
                    )
                    .map(
                      (item) => html`
                      <div 
                        @click=${() => this._openTab(item.id, item.name)}
                        class="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/20 cursor-pointer transition-all duration-200"
                      >
                        <div class="flex items-center gap-2 mb-2">
                          <span class="w-2 h-2 rounded-full bg-${item.color}-400"></span>
                          <h3 class="font-semibold text-sm">${item.name}</h3>
                        </div>
                        <p class="text-xs text-white/50 leading-relaxed">${item.desc}</p>
                      </div>
                    `,
                    )}
                </div>
              </div>
            `,
            when(
              this.view === 'wasm',
              html`
                <div class="text-[1.1rem] font-bold text-amber-400 mt-6 mb-3 pb-2 border-b border-white/10">Non-framework Primitives</div>
                <p class="text-sm text-white/50 mb-4">
                  Raw functions exposed on <code class="text-[0.8rem] bg-white/10 px-1 py-0.5 rounded">window.*</code>
                  by the Rust/WASM <code class="text-[0.8rem] bg-white/10 px-1 py-0.5 rounded">web-core</code> module
                </p>
                ${WASM_ITEMS.map((item, i) => renderItem(item, i))}
              `,
              when(
                this.view === 'framework',
                html`
                  <div class="text-[1.1rem] font-bold text-blue-400 mt-6 mb-3 pb-2 border-b border-white/10">Framework Primitives</div>
                  <p class="text-sm text-white/50 mb-4">BAEX (Browser API Extended) framework built on top of the WASM primitives</p>
                  ${FRAMEWORK_ITEMS.map((item, i) => renderItem(item, i + WASM_ITEMS.length))}
                `,
                html`
                  <div class="text-[1.1rem] font-bold text-white/80 mt-6 mb-3 pb-2 border-b border-white/10">${this.view}</div>
                  <p class="text-sm text-white/50 mb-4">This is a dynamically opened tab from the Home grid.</p>
                `,
              ),
            ),
          )}
        </div>
      </div>
    `;
  }
}

defineComponent('baex-app', AppElement);
