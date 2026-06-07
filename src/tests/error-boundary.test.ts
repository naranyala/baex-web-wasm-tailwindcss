import { describe, it, expect } from 'vitest';
import { setupWasm } from './setup';
import { ErrorBoundary } from '../framework/error-boundary';
import { html } from '../framework/index';
import { BaexElement } from '../framework/baex-element';

describe('ErrorBoundary', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  it('catches render errors and shows fallback', () => {
    const boundary = new ErrorBoundary({
      fallback: (err) => html`<div class="fallback">${err.message}</div>`
    });

    class CrashingComp extends BaexElement {
      render() {
        throw new Error('Crash!');
      }
    }
    const comp = new CrashingComp();
    const renderFn = () => comp.render();
    
    const result = boundary.wrap(comp, renderFn)();
    expect(result.html).toContain('fallback');
    expect(result.html).toContain('Crash!');
    expect(boundary.hasError).toBe(true);
  });

  it('allows retry', () => {
    const boundary = new ErrorBoundary();
    let shouldCrash = true;
    const renderFn = () => {
      if (shouldCrash) throw new Error('Crash!');
      return html`<div>Fixed</div>`;
    };

    boundary.wrap({} as any, renderFn)();
    expect(boundary.hasError).toBe(true);

    shouldCrash = false;
    boundary.retry();
    expect(boundary.hasError).toBe(false);
  });
});
