import { beforeAll, describe, expect, it } from 'vitest';
import { css, html } from '../framework/template.js';
import { setupWasm } from './setup.js';

beforeAll(async () => {
  await setupWasm();
});

describe('css', () => {
  it('concatenates template strings with values', () => {
    const result = css`
      :host { color: ${'red'}; }
      .foo { font-size: ${'14px'}; }
    `;
    expect(result).toContain('color: red;');
    expect(result).toContain('font-size: 14px;');
  });

  it('handles no interpolations', () => {
    const result = css`plain text`;
    expect(result).toBe('plain text');
  });

  it('coerces non-string values', () => {
    const result = css`width: ${100}%;`;
    expect(result).toBe('width: 100%;');
  });
});

describe('html', () => {
  it('renders simple text interpolation', () => {
    const result = html`<p>${'Hello World'}</p>`;
    expect(result.html).toBe('<p>Hello World</p>');
    expect(result.bindings).toHaveLength(0);
  });

  it('renders without any interpolation', () => {
    const result = html`<div>static</div>`;
    expect(result.html).toBe('<div>static</div>');
    expect(result.bindings).toHaveLength(0);
  });

  it('escapes HTML in text values', () => {
    const result = html`<p>${'<script>alert(1)</script>'}</p>`;
    expect(result.html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('creates an event binding with @ prefix', () => {
    const handler = () => {};
    const result = html`<button @click=${handler}>Click</button>`;
    expect(result.html).toContain('data-baex="b0"');
    expect(result.html).not.toContain('@click=');

    expect(result.bindings).toHaveLength(1);
    const b = result.bindings[0];
    expect(b.type).toBe('event');
    expect(b.eventName).toBe('click');
    expect(b.value).toBe(handler);
  });

  it('creates a property binding with . prefix', () => {
    const result = html`<input .value=${'test'}>`;
    expect(result.bindings).toHaveLength(1);
    const b = result.bindings[0];
    expect(b.type).toBe('property');
    expect(b.propName).toBe('value');
    expect(b.value).toBe('test');
  });

  it('creates a bool binding with ? prefix', () => {
    const result = html`<div ?hidden=${true}></div>`;
    expect(result.bindings).toHaveLength(1);
    const b = result.bindings[0];
    expect(b.type).toBe('bool');
    expect(b.attrName).toBe('hidden');
    expect(b.value).toBe(true);
  });

  it('unwraps Signal for property bindings', () => {
    const signal = { value: 'unwrapped' };
    const result = html`<input .value=${signal}>`;
    expect(result.bindings).toHaveLength(1);
    const b = result.bindings[0];
    expect(b.type).toBe('property');
    expect(b.propName).toBe('value');
    expect(b.value).toBe('unwrapped');
  });

  it('passes Signal directly for event bindings', () => {
    const signal = { value: 'not-a-function' };
    const result = html`<button @click=${signal}>Click</button>`;
    expect(result.bindings).toHaveLength(1);
    const b = result.bindings[0];
    expect(b.type).toBe('event');
    expect(b.value).toBe(signal);
  });

  it('handles null and undefined text values', () => {
    const result1 = html`<p>${null}</p>`;
    expect(result1.html).toBe('<p></p>');

    const result2 = html`<p>${undefined}</p>`;
    expect(result2.html).toBe('<p></p>');
  });

  it('handles number text values', () => {
    const result = html`<span>${42}</span>`;
    expect(result.html).toBe('<span>42</span>');
  });

  it('handles boolean text values', () => {
    const result = html`<span>${true}</span>`;
    expect(result.html).toBe('<span>true</span>');
  });

  it('handles multiple bindings in one template', () => {
    const handler = () => {};
    const result = html`
      <button @click=${handler} .disabled=${true} ?hidden=${false}>
        ${'label'}
      </button>
    `;
    // 3 bindings + 1 text value
    const eventB = result.bindings.find((b) => b.type === 'event');
    const propB = result.bindings.find((b) => b.type === 'property');
    const boolB = result.bindings.find((b) => b.type === 'bool');

    expect(eventB?.eventName).toBe('click');
    expect(eventB?.value).toBe(handler);
    expect(propB?.propName).toBe('disabled');
    expect(propB?.value).toBe(true);
    expect(boolB?.attrName).toBe('hidden');
    expect(boolB?.value).toBe(false);
    expect(result.html).toContain('label');
  });
});
