import { describe, it, expect } from 'vitest';
import { setupWasm } from './setup';
import { html } from '../framework/index';

describe('Blueprint WASM Parsing', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  it('parses a simple tree structure', () => {
    const result = html`
      <div class="container">
        <p>Hello</p>
        <span .value=${'world'}></span>
      </div>
    `;

    const bp = result.blueprint;
    expect(bp.root.tag).toBe('div');
    expect(bp.root.children).toHaveLength(2);
    expect(bp.root.children[0].tag).toBe('p');
    expect(bp.root.children[1].tag).toBe('span');
  });

  it('identifies data-baex markers and maps them to node indices', () => {
    const result = html`
      <div .innerHTML=${'test'}></div>
    `;

    const binding = result.bindings[0];
    expect(binding.nodeIdx).toBeDefined();
    expect(typeof binding.nodeIdx).toBe('number');
  });

  it('identifies key attributes', () => {
    const result = html`
      <div key="root">
        <div key="item-1">1</div>
        <div key="item-2">2</div>
      </div>
    `;

    const bp = result.blueprint;
    expect(bp.root.attributes.find(a => a.name === 'key')?.isKey).toBe(true);
    expect(bp.root.children[0].attributes.find(a => a.name === 'key')?.isKey).toBe(true);
  });
});
