import { highlightCode } from '../framework/highlighter.js';
import { BaexElement } from '../framework/index.js';
import { html, Raw } from '../framework/template.js';

export class BaexCodeBlock extends BaexElement {
  static properties = {
    code: { type: String },
    lang: { type: String },
  };

  constructor() {
    super();
    this.style.display = 'block';
  }

  private _copyTimer: number | null = null;
  private _highlightRequestId = 0;

  async onConnected() {
    this.updateHighlighting();
  }

  onUpdate(changed: Record<string, unknown>) {
    if (changed.code !== undefined || changed.lang !== undefined) {
      this.updateHighlighting();
    }
  }

  async updateHighlighting() {
    const code = this.code || '';
    const lang = this.lang || 'typescript';
    const requestId = ++this._highlightRequestId;

    if (!code) {
      this._setCodeContainer(
        Raw(
          `<pre class="m-0 p-0 text-[0.8rem] leading-relaxed overflow-x-auto whitespace-pre [tab-size:2] font-['JetBrains_Mono',monospace]"></pre>`,
        ),
      );
      return;
    }

    try {
      const result = await highlightCode(code, lang);
      if (requestId !== this._highlightRequestId) return;
      this._setCodeContainer(Raw(result));
    } catch (e) {
      console.error('BaexCodeBlock highlighting failed:', e);
      if (requestId !== this._highlightRequestId) return;
      this._setCodeContainer(
        Raw(
          `<pre class="m-0 p-0 text-[0.8rem] leading-relaxed overflow-x-auto whitespace-pre [tab-size:2] font-['JetBrains_Mono',monospace]">${code}</pre>`,
        ),
      );
    }
  }

  private _setCodeContainer(content: { value: string }) {
    const container = this.querySelector('[data-code-container]');
    if (container) {
      container.innerHTML = content.value;
    }
  }

  private _handleCopy = async (e: Event) => {
    const btn = e.currentTarget as HTMLElement;
    try {
      await navigator.clipboard.writeText(this.code || '');
      btn.textContent = 'Copied!';
      btn.className = `${btn.className.replace(/(border|text|bg)-[\w-]+/g, '')} border-green-400 text-green-400 bg-green-400/10`;

      if (this._copyTimer) clearTimeout(this._copyTimer);
      this._copyTimer = window.setTimeout(() => {
        btn.textContent = 'Copy';
        btn.className = `${btn.className.replace(/(border|text|bg)-[\w-]+(\/\d+)?/g, '')} border-white/20 text-white/50 bg-white/[0.06]`;
      }, 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  render() {
    return html`
      <div class="relative group">
        <span class="block mb-1.5 text-[0.65rem] font-semibold tracking-wider uppercase text-white/30">
          ${this.lang || 'typescript'}
        </span>
        <div class="relative overflow-hidden rounded-md border border-white/[0.06] bg-black/30 p-6">
          <div data-code-container class="overflow-x-auto">
            <pre class="m-0 p-0 text-[0.8rem] leading-relaxed whitespace-pre [tab-size:2] font-['JetBrains_Mono',monospace]">${this.code || ''}</pre>
          </div>
          <button 
            @click=${this._handleCopy}
            class="absolute top-2 right-2 px-2 py-0.5 text-[0.7rem] rounded border border-white/20 bg-white/[0.06] text-white/50 cursor-pointer transition-all duration-150 hover:bg-white/10 hover:text-white/80 font-inherit"
          >
            Copy
          </button>
        </div>
      </div>
    `;
  }
}
