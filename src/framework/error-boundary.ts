import { BaexElement } from './baex-element.js';
import { html, TemplateResult } from './template.js';

interface ErrorBoundaryOptions {
  fallback?: (error: Error) => TemplateResult | string;
}

export class ErrorBoundary {
  private _error: Error | null = null;
  private _options: ErrorBoundaryOptions;
  private _originalRender: (() => TemplateResult | string) | null = null;
  private _component: BaexElement | null = null;

  constructor(options: ErrorBoundaryOptions = {}) {
    this._options = options;
  }

  wrap(component: BaexElement, renderFn: () => TemplateResult | string): () => TemplateResult | string {
    this._component = component;
    this._originalRender = renderFn;
    return () => {
      if (this._error) {
        const fallback = this._options.fallback;
        if (fallback) return fallback(this._error);
        return html`<div class="baex-error" style="padding:1rem;border:1px solid #f44;border-radius:4px;background:#1a0000;color:#f88">
          <strong>Error:</strong> ${this._error.message}
        </div>`;
      }
      try {
        return renderFn();
      } catch (e) {
        this._error = e instanceof Error ? e : new Error(String(e));
        return this.wrap(component, renderFn)();
      }
    };
  }

  retry() {
    this._error = null;
    this._component?.requestUpdate(true);
  }

  get error(): Error | null {
    return this._error;
  }

  get hasError(): boolean {
    return this._error !== null;
  }
}
