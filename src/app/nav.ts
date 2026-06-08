import { BaexElement, defineComponent, html } from '../framework/index.js';
import { createSignal } from '../framework/signals.js';

const viewSignal = createSignal('app_view', 'rag');
const tabsSignal = createSignal<{ id: string; name: string }[]>('app_tabs', []);

// ── Persistent tabs state ────────────────────────────────────────
import { loadTabsState, saveTabsState } from '../utils/tabs-storage.js';

const restored = loadTabsState();
if (restored) {
  if (restored.tabs.length > 0) tabsSignal.value = restored.tabs;
  if (restored.activeView) viewSignal.value = restored.activeView;
}

let persistPending = false;
function persist() {
  if (persistPending) return;
  persistPending = true;
  queueMicrotask(() => {
    persistPending = false;
    saveTabsState({
      tabs: tabsSignal.value as { id: string; name: string }[],
      activeView: viewSignal.value as string,
    });
  });
}
viewSignal.subscribe(persist);
tabsSignal.subscribe(persist);

export class BaexNav extends BaexElement {
  static properties = {
    tabs: { type: Array, attribute: false },
  };

  tabs: { id: string; name: string }[] = [];

  onConnected() {
    this.track(viewSignal, (val) => {
      this.whenUpdate(() => this._updateActiveState(val as string));
    });
    this.track(tabsSignal, (val) => {
      this.tabs = val as { id: string; name: string }[];
      this.requestUpdate(true);
    });
    this.tabs = tabsSignal.value as { id: string; name: string }[];
    this._updateActiveState(viewSignal.value);
  }

  protected onAfterUpdate() {
    this._updateActiveState(viewSignal.value as string);
  }

  private _updateActiveState(view: string) {
    if (!this.isConnected) return;
    const buttons = this.querySelectorAll<HTMLElement>('.nav-tab');
    buttons.forEach((btn) => {
      const isActive = btn.getAttribute('data-view') === view;
      btn.classList.toggle('bg-white/[0.08]', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('hover:bg-white/[0.05]', !isActive);
      btn.classList.toggle('text-white/60', !isActive);
    });
  }

  private _handleNav = (e: Event) => {
    const target = e.target as HTMLElement;

    const closeBtn = target.closest('[data-close-tab]') as HTMLElement | null;
    if (closeBtn) {
      e.stopPropagation();
      const id = closeBtn.getAttribute('data-close-tab');
      if (id) {
        const currentTabs = tabsSignal.value as { id: string; name: string }[];
        tabsSignal.value = currentTabs.filter((t) => t.id !== id);
        if (viewSignal.value === id) {
          viewSignal.value = 'rag';
        }
      }
      return;
    }

    const tab = target.closest('.nav-tab') as HTMLElement | null;
    if (tab) {
      const view = tab.getAttribute('data-view');
      if (view) {
        viewSignal.value = view;
      }
    }
  };

  render() {
    const tabs = this.tabs || [];

    return html`
      <nav class="fixed top-0 left-0 right-0 z-50 flex items-center h-12 bg-[#0a0e17]/95 backdrop-blur-md border-b border-white/[0.06] px-4 gap-1">
        <div
          data-view="rag"
          class="nav-tab flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150 bg-white/[0.08] text-white"
          @click=${this._handleNav}
        >
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          <span>RAG</span>
        </div>

        ${tabs.map(
          (tab) => html`
            <div
              data-view="${tab.id}"
              class="nav-tab flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150 text-white/60 hover:bg-white/[0.05] hover:text-white group"
              @click=${this._handleNav}
            >
              <span>${tab.name}</span>
              <button
                data-close-tab="${tab.id}"
                class="w-4 h-4 flex items-center justify-center rounded text-white/20 hover:text-white hover:bg-white/10 transition-all text-[10px] leading-none opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          `,
        )}

        <div class="flex-1"></div>
      </nav>
    `;
  }
}

defineComponent('baex-nav', BaexNav);

export { tabsSignal, viewSignal };
