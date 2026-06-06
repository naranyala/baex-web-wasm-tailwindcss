import { beforeAll, describe, expect, it } from 'vitest';
import { html } from '../framework/index.js';
import { Raw } from '../framework/template.js';
import { setupWasm } from './setup.js';

beforeAll(async () => {
  await setupWasm();
});

describe('Raw() in templates', () => {
  it('unwraps Raw objects in text interpolations', () => {
    const result = html`<div>${Raw('<span>raw html</span>')}</div>`;
    expect(result.html).toBe('<div><span>raw html</span></div>');
  });

  it('handles Raw in arrays via map()', () => {
    const items = ['a', 'b', 'c'];
    const result = html`<ul>${items.map((i) => Raw(`<li>${i}</li>`))}</ul>`;
    expect(result.html).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
  });

  it('preserves Raw alongside escaped text', () => {
    const result = html`<p>${'safe'} ${Raw('<b>bold</b>')}</p>`;
    expect(result.html).toBe('<p>safe <b>bold</b></p>');
  });

  it('does not escape content inside Raw', () => {
    const result = html`<div>${Raw('<script>alert(1)</script>')}</div>`;
    expect(result.html).toContain('<script>');
    expect(result.html).not.toContain('&lt;script&gt;');
  });
});
