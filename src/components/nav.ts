import { BaexElement, defineComponent, html } from '../framework/index.js';
import { createSignal } from '../framework/signals.js';
import { Raw } from '../framework/template.js';

const viewSignal = createSignal('app_view', 'home');
const tabsSignal = createSignal<{ id: string; name: string }[]>('app_tabs', []);

export class BaexNav extends BaexElement {
  static properties = {
    tabs: { type: Array, attribute: false },
  };

  tabs: { id: string; name: string }[] = [];

  private _unsubscribeView: (() => void) | null = null;
  private _unsubscribeTabs: (() => void) | null = null;

  onConnected() {
    this.track(viewSignal, (val) => {
      this._updateActiveState(val as string);
    });
    this.track(tabsSignal, (val) => {
      this.tabs = val as { id: string; name: string }[];
      this.requestUpdate(true);
    });
    this.tabs = tabsSignal.value as { id: string; name: string }[];
    this._updateActiveState(viewSignal.value);
  }

  onDisconnected() {
    // Subscriptions are handled automatically by this.track
  }

  private _updateActiveState(view: string) {
    if (!this.isConnected) return;
    requestAnimationFrame(() => {
      const buttons = Array.from(this.querySelectorAll('.nav-btn-wrapper'));
      const indicator = this.querySelector('.nav-indicator') as HTMLElement;

      if (!indicator) return;

      const totalTabs = buttons.length;
      if (totalTabs === 0) {
        indicator.style.opacity = '0';
        return;
      }

      indicator.style.opacity = '1';
      let activeIdx = buttons.findIndex(
        (b) => b.getAttribute('data-view') === view,
      );
      if (activeIdx === -1) activeIdx = 0;

      const widthPercent = 100 / totalTabs;
      indicator.style.width = `calc(${widthPercent}% - 8px)`;
      indicator.style.transform = `translateX(${activeIdx * 100}%)`;

      buttons.forEach((btn, idx) => {
        const isActive = idx === activeIdx;
        const textBtn = btn.querySelector('.nav-btn');
        if (textBtn) {
          textBtn.classList.toggle('text-white', isActive);
          textBtn.classList.toggle('text-white/40', !isActive);
        }
      });
    });
  }

  private _handleNav = (e: Event) => {
    const target = e.target as HTMLElement;

    // Check for close tab button first
    const closeBtn = target.closest('[data-close-tab]') as HTMLElement | null;
    if (closeBtn) {
      e.stopPropagation();
      const id = closeBtn.getAttribute('data-close-tab');
      if (id) {
        const currentTabs = tabsSignal.value as { id: string; name: string }[];
        tabsSignal.value = currentTabs.filter((t) => t.id !== id);
        if (viewSignal.value === id) {
          viewSignal.value = 'home';
        }
      }
      return;
    }

    const wrapper = target.closest('.nav-btn-wrapper') as HTMLElement | null;
    if (wrapper) {
      const view = wrapper.getAttribute('data-view');
      if (view) {
        viewSignal.value = view;
      }
    }
  };

  render() {
    const tabs = this.tabs || [];
    const homeWidth = 100 / (tabs.length + 1);

    return html`
      <nav class="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 bg-[#020917]/80 backdrop-blur-md">
        <div 
          @click=${this._handleNav}
          class="relative flex items-stretch cursor-pointer rounded-md overflow-hidden"
        >
          <div 
            class="nav-indicator absolute top-0 bottom-0 left-0 bg-white/10 transition-all duration-300 ease-out" 
            style="width: calc(${homeWidth}% - 8px);"
          ></div>
          
          <div data-view="home" class="nav-btn-wrapper relative">
            <button class="nav-btn relative px-5 py-2 text-sm font-medium transition-colors duration-200 text-white">
              Home
            </button>
          </div>
          ${
            tabs.length > 0
              ? tabs.map((tab) =>
                  Raw(`
                <div data-view="${tab.id}" class="nav-btn-wrapper relative flex items-center group">
                  <button class="nav-btn relative px-5 py-2 text-sm font-medium transition-colors duration-200 text-white/40 hover:text-white">
                    ${tab.name}
                  </button>
                  <button 
                    data-close-tab="${tab.id}"
                    class="mr-3 w-4 h-4 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all text-[10px] leading-none"
                  >
                    ✕
                  </button>
                </div>
              `),
                )
              : ''
          }
        </div>
      </nav>
    `;
  }
}

defineComponent('baex-nav', BaexNav);

export { tabsSignal, viewSignal };
