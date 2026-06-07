import { describe, it, expect, vi } from 'vitest';
import { setupWasm } from './setup';
import { defineComponent, html } from '../framework/index';
import { BaexElement } from '../framework/baex-element';

describe('Refs and Lifecycle', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  it('handles .ref binding', async () => {
    let capturedEl: HTMLElement | null = null;
    class RefComp extends BaexElement {
      render() {
        return html`<div .ref=${(el: HTMLElement) => { capturedEl = el; }}>Hello</div>`;
      }
    }
    defineComponent('ref-comp', RefComp);
    const el = document.createElement('ref-comp');
    document.body.appendChild(el);
    await new Promise(r => queueMicrotask(r));

    expect(capturedEl).toBeInstanceOf(HTMLElement);
    expect(capturedEl?.textContent).toBe('Hello');
  });

  it('triggers new lifecycle hooks', async () => {
    let beforeMount = false;
    let afterUpdate = false;
    let beforeUnmount = false;

    class LifeComp extends BaexElement {
      onBeforeMount() { beforeMount = true; }
      onAfterUpdate() { afterUpdate = true; }
      onBeforeUnmount() { beforeUnmount = true; }
      render() { return html`<div>Life</div>`; }
    }
    defineComponent('life-comp', LifeComp);
    const el = document.createElement('life-comp');
    document.body.appendChild(el);
    await new Promise(r => queueMicrotask(r));

    expect(beforeMount).toBe(true);
    expect(afterUpdate).toBe(true);

    document.body.removeChild(el);
    expect(beforeUnmount).toBe(true);
  });
});
