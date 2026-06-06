import { beforeAll, describe, expect, it } from 'vitest';
import { BaexElement, createSignal, html } from '../framework/index.js';
import { setupWasm } from './setup.js';

describe('Framework Integration (Real WASM)', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  it('initializes WASM and registers globals on window', () => {
    expect(window.processTemplate).toBeDefined();
    expect(window.createSignal).toBeDefined();
    expect(window.getSignal).toBeDefined();
    expect(window.setSignal).toBeDefined();
    expect(window.onSignalChange).toBeDefined();
    expect(window.resolveObservedAttributes).toBeDefined();
    expect(window.serializeProperty).toBeDefined();
    expect(window.deserializeProperty).toBeDefined();
    expect(window.register_component).toBeDefined();
    expect(window.update_component_property).toBeDefined();
  });

  it('renders HTML using the Rust template engine', () => {
    const result = html`<div class="x">Hello ${'WASM'}</div>`;
    expect(result.html).toBe('<div class="x">Hello WASM</div>');
  });

  it('escapes HTML in text values', () => {
    const result = html`<p>${'<script>alert(1)</script>'}</p>`;
    expect(result.html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('processes event bindings using the Rust engine', () => {
    const handler = () => {};
    const result = html`<button @click=${handler}>Go</button>`;
    expect(result.html).toContain('data-baex="b');
    expect(result.bindings[0].type).toBe('event');
    expect(result.bindings[0].eventName).toBe('click');
    expect(result.bindings[0].value).toBe(handler);
  });

  it('syncs Signals between JS and Rust stores', () => {
    const s = createSignal('int_sig_test', 100);
    expect(s.value).toBe(100);
    expect(window.getSignal('int_sig_test')).toBe(100);

    s.value = 200;
    expect(window.getSignal('int_sig_test')).toBe(200);
  });

  it('resolves observed attributes via Rust helper', () => {
    class TestComp extends BaexElement {
      static properties = {
        name: { type: String },
        age: { attribute: false },
        id: { attribute: 'data-id' },
      };
      name = '';
      age = 0;
      id = '';
      render() {
        return '';
      }
    }

    const attrs = (TestComp as unknown as typeof BaexElement)
      .observedAttributes;
    expect(attrs).toContain('name');
    expect(attrs).toContain('data-id');
    expect(attrs).not.toContain('age');
  });

  it('serializes and deserializes properties via Rust', () => {
    expect(window.serializeProperty(42, 'number')).toBe('42');
    expect(window.deserializeProperty('42', 'number')).toBe(42);

    expect(window.serializeProperty(true, 'boolean')).toBe('');
    expect(window.deserializeProperty('', 'boolean')).toBe(true);
    expect(window.serializeProperty(false, 'boolean')).toBeNull();
    expect(window.deserializeProperty('false', 'boolean')).toBe(false);

    const obj = { foo: 'bar' };
    expect(window.serializeProperty(obj, 'object')).toBe('{"foo":"bar"}');
    expect(window.deserializeProperty('{"foo":"bar"}', 'object')).toEqual({
      foo: 'bar',
    });
  });

  it('handles nested TemplateResults via Rust engine', () => {
    const inner = html`<span class="i">inner</span>`;
    const outer = html`<div class="o">${inner}</div>`;
    expect(outer.html).toBe(
      '<div class="o"><span class="i">inner</span></div>',
    );
  });
});
