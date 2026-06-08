import { BaexElement, defineComponent, html, createSignal, Signal } from '../framework/index.js';

interface DrawerItem {
  name: string;
  icon: string;
  color: string;
  desc: string;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { name: 'Profile', icon: '👤', color: 'blue', desc: 'Manage account settings' },
  { name: 'Security', icon: '🛡️', color: 'green', desc: 'Password & 2FA' },
  { name: 'Payments', icon: '💳', color: 'purple', desc: 'Billing & Invoices' },
  { name: 'Storage', icon: '☁️', color: 'orange', desc: 'Cloud space usage' },
  { name: 'API Keys', icon: '🔑', color: 'pink', desc: 'Developer access' },
  { name: 'Support', icon: '🎧', color: 'cyan', desc: 'Help center & Tickets' },
];

export class BottomDrawer extends BaexElement {
  private _isOpen!: Signal<boolean>;

  constructor() {
    super();
    this._isOpen = createSignal('drawer_open', false, this._cid);
  }

  onConnected() {
    this.track(this._isOpen, (val) => {
      this._updateBodyScroll(val as boolean);
      this.requestUpdate();
    });
  }

  onDisconnected() {
    this._updateBodyScroll(false);
  }

  private _updateBodyScroll(open: boolean) {
    document.body.style.overflow = open ? 'hidden' : '';
  }

  private _toggle = () => {
    this._isOpen.value = !this._isOpen.value;
  };

  render() {
    const isOpen = this._isOpen.value;

    return html`
      <div class="relative flex flex-col items-center justify-center min-h-[400px] bg-white/[0.02] rounded-3xl border border-white/[0.08] p-8 backdrop-blur-sm">
        <button 
          @click=${this._toggle}
          class="group relative px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95 border border-white/10 overflow-hidden"
        >
          <div class="relative z-10 flex items-center gap-2">
            <span class="text-xl">${isOpen ? '✕' : '⚡'}</span>
            <span>${isOpen ? 'Close Menu' : 'Open Quick Menu'}</span>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>

        <!-- Overlay -->
        <div 
          @click=${this._toggle}
          class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
        ></div>

        <!-- Drawer -->
        <div 
          class="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1d] border-t border-white/[0.1] rounded-t-[32px] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}"
          style="max-width: 640px; margin: 0 auto; box-shadow: 0 -20px 50px rgba(0,0,0,0.5);"
        >
          <!-- Handle -->
          <div class="flex justify-center py-4">
            <div class="w-12 h-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors cursor-pointer" @click=${this._toggle}></div>
          </div>

          <div class="p-8 pb-12">
            <div class="flex justify-between items-center mb-8">
              <div>
                <h3 class="text-2xl font-bold text-white tracking-tight">Quick Access</h3>
                <p class="text-sm text-gray-500">Select a module to jump to</p>
              </div>
              <button @click=${this._toggle} class="p-2 rounded-full bg-white/[0.05] text-gray-400 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              ${DRAWER_ITEMS.map((item) => html`
                <button class="flex flex-col items-start p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all group text-left relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-${item.color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span class="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">${item.icon}</span>
                  <span class="text-sm font-bold text-white/90 group-hover:text-white">${item.name}</span>
                  <span class="text-[11px] text-gray-500 leading-relaxed mt-1">${item.desc}</span>
                  <div class="absolute bottom-0 left-0 w-full h-1 bg-${item.color}-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </button>
              `)}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

defineComponent('baex-bottom-drawer', BottomDrawer);
