import { describe, expect, it, vi } from 'vitest';
import { BaexElement } from '../framework/baex-element.js';
import { defineComponent } from '../framework/index.js';

class TestComp extends BaexElement {
  render() {
    return '';
  }
}

describe('defineComponent', () => {
  it('registers a component with customElements.define', () => {
    const spy = vi.spyOn(customElements, 'define');
    const tag = `test-define-comp-${Date.now()}`;
    defineComponent(tag, TestComp);
    expect(spy).toHaveBeenCalledWith(tag, TestComp);
    spy.mockRestore();
  });

  it('silently skips on duplicate tag registration', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tag = `test-dup-comp-${Date.now()}`;

    defineComponent(tag, TestComp);
    expect(() => defineComponent(tag, TestComp)).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('silently skips when same constructor is used with a different tag', () => {
    const tag1 = `test-reuse-comp-${Date.now()}-a`;
    const tag2 = `test-reuse-comp-${Date.now()}-b`;

    defineComponent(tag1, TestComp);
    expect(() => defineComponent(tag2, TestComp)).not.toThrow();
  });
});
