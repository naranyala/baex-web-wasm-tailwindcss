import { beforeAll, describe, expect, it } from 'vitest';
import { BaexElement, defineComponent, html } from '../framework/index.js';
import { Raw } from '../framework/template.js';
import { setupWasm } from './setup.js';

beforeAll(async () => {
  await setupWasm();
});

describe('Accordion behavior', () => {
  it('renders closed accordions with no open class', async () => {
    class AccordionEl extends BaexElement {
      items = ['one', 'two', 'three'];
      render() {
        return html`<div>
          ${this.items.map(
            (item, idx) => html`
              <div>
                <button data-acc-header="${idx}">${item}</button>
                <div data-acc-body="${idx}" class="accordion-body">
                  <div>Content ${item}</div>
                </div>
              </div>
            `,
          )}
        </div>`;
      }
    }
    defineComponent('test-accordion', AccordionEl);

    const el = document.createElement('test-accordion') as AccordionEl;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    const bodies = el.querySelectorAll('[data-acc-body]');
    bodies.forEach((body) => {
      expect(body.classList.contains('open')).toBe(false);
    });
    document.body.removeChild(el);
  });

  it('toggles open class on body when header is clicked', async () => {
    class AccordionEl extends BaexElement {
      items = ['a', 'b'];
      handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const header = target.closest(
          '[data-acc-header]',
        ) as HTMLElement | null;
        if (!header) return;
        const idx = header.getAttribute('data-acc-header');
        if (idx === null) return;
        const body = this.querySelector(`[data-acc-body="${idx}"]`);
        if (!body) return;
        body.classList.toggle('open');
      };
      render() {
        return html`<div>
          ${this.items.map(
            (item, idx) => html`
              <div>
                <button data-acc-header="${idx}">${item}</button>
                <div data-acc-body="${idx}" class="accordion-body">
                  <div>Content ${item}</div>
                </div>
              </div>
            `,
          )}
        </div>`;
      }
    }
    defineComponent('test-accordion-2', AccordionEl);

    const el = document.createElement('test-accordion-2') as AccordionEl;
    el.addEventListener('click', el.handleClick);
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    const header = el.querySelector('[data-acc-header="0"]') as HTMLElement;
    const body = el.querySelector('[data-acc-body="0"]') as HTMLElement;

    expect(body.classList.contains('open')).toBe(false);
    header.click();
    expect(body.classList.contains('open')).toBe(true);
    header.click();
    expect(body.classList.contains('open')).toBe(false);

    document.body.removeChild(el);
  });
});

describe('BaexCodeBlock-shaped component (Raw in code container)', () => {
  it('renders fallback content and can be updated via direct DOM', async () => {
    class CodeBlockLike extends BaexElement {
      static properties = { code: { type: String } };
      code = '';
      render() {
        return html`<div>
          <div data-code-container>
            <pre>${this.code}</pre>
          </div>
          <button>Copy</button>
        </div>`;
      }
      _setCode(content: { value: string }) {
        const container = this.querySelector('[data-code-container]');
        if (container) container.innerHTML = content.value;
      }
    }
    defineComponent('test-codeblock', CodeBlockLike);

    const el = document.createElement('test-codeblock') as CodeBlockLike;
    document.body.appendChild(el);
    el.code = 'const x = 1;';
    await new Promise((r) => queueMicrotask(r));

    expect(el.querySelector('[data-code-container] pre')?.textContent).toBe(
      'const x = 1;',
    );

    el._setCode(Raw('<pre class="hl">highlighted</pre>'));
    expect(el.querySelector('.hl')?.textContent).toBe('highlighted');

    document.body.removeChild(el);
  });
});
