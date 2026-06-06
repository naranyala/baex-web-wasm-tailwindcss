import { beforeEach, describe, expect, it } from 'vitest';
import { BaexElement, defineComponent, html } from '../framework/index.js';
import { Raw } from '../framework/template.js';
import { setupWasm } from './setup';

describe('Framework Stress Tests', () => {
  beforeEach(async () => {
    await setupWasm();
  });

  it('batches rapid property updates into a single render', async () => {
    class StressEl extends BaexElement {
      static properties = { count: { type: Number } };
      count = 0;
      render() {
        return html`<div>${this.count}</div>`;
      }
    }
    defineComponent('stress-el', StressEl);
    const el = document.createElement('stress-el') as StressEl;
    document.body.appendChild(el);

    let renderCount = 0;
    const originalRender = el.render.bind(el);
    el.render = () => {
      renderCount++;
      return originalRender();
    };

    for (let i = 0; i < 1000; i++) {
      el.count = i;
    }

    expect(renderCount).toBe(0);

    await new Promise((r) => queueMicrotask(r));

    expect(renderCount).toBe(1);
    expect(el.innerHTML).toContain('999');
    document.body.removeChild(el);
  });

  it('handles mass component creation and destruction', async () => {
    class TinyEl extends BaexElement {
      static properties = { val: { type: String } };
      val = '';
      render() {
        return html`<span>${this.val}</span>`;
      }
    }
    defineComponent('tiny-el', TinyEl);

    const count = 200;
    const elements: TinyEl[] = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('tiny-el') as TinyEl;
      el.val = `val-${i}`;
      elements.push(el);
    }

    const container = document.createElement('div');
    for (const el of elements) {
      container.appendChild(el);
    }
    document.body.appendChild(container);

    elements.forEach((el, i) => {
      el.val = `updated-${i}`;
    });

    await new Promise((r) => queueMicrotask(r));

    expect(elements[0].innerHTML).toContain('updated-0');
    expect(elements[count - 1].innerHTML).toContain(`updated-${count - 1}`);

    document.body.removeChild(container);
  });

  it('handles deeply nested templates', async () => {
    const depth = 50;
    const createNested = (d: number) => {
      if (d === 0) return html`<span>base</span>`;
      return html`<div>${createNested(d - 1)}</div>`;
    };

    const result = createNested(depth);

    class NestedEl extends BaexElement {
      render() {
        return result;
      }
    }
    defineComponent('nested-el', NestedEl);
    const el = document.createElement('nested-el');
    document.body.appendChild(el);

    await new Promise((r) => queueMicrotask(r));
    expect(el.innerHTML).toContain('base');
    document.body.removeChild(el);
  });

  it('handles complex property types (objects/arrays)', async () => {
    class ComplexEl extends BaexElement {
      static properties = {
        data: { type: Object },
        list: { type: Array },
      };
      data = { a: 1 };
      list = [1, 2];
      render() {
        return html`<div>${JSON.stringify(this.data)} ${JSON.stringify(this.list)}</div>`;
      }
    }
    defineComponent('complex-el', ComplexEl);
    const el = document.createElement('complex-el') as ComplexEl;
    document.body.appendChild(el);

    el.data = { a: 2, b: 3 };
    el.list = [1, 2, 3];

    await new Promise((r) => queueMicrotask(r));
    expect(el.innerHTML).toContain('{"a":2,"b":3}');
    expect(el.innerHTML).toContain('[1,2,3]');
    document.body.removeChild(el);
  });
});
