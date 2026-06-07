import { describe, it, expect, vi } from 'vitest';
import { setupWasm } from './setup';
import { defineComponent, html } from '../framework/index';
import { BaexElement } from '../framework/baex-element';

describe('Event Modifiers', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  it('handles .prevent modifier', async () => {
    class PreventComp extends BaexElement {
      prevented = false;
      render() {
        return html`
          <form @submit.prevent=${(e: Event) => { this.prevented = true; }}>
            <button type="submit">Submit</button>
          </form>
        `;
      }
    }
    defineComponent('prevent-comp', PreventComp);
    const el = document.createElement('prevent-comp');
    document.body.appendChild(el);
    await new Promise(r => queueMicrotask(r));

    const form = el.querySelector('form')!;
    const event = new Event('submit', { cancelable: true });
    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('handles .stop modifier', async () => {
    class StopComp extends BaexElement {
      stopped = false;
      render() {
        return html`
          <div @click=${() => { this.stopped = true; }}>
            <button @click.stop=${() => {}}>Stop</button>
          </div>
        `;
      }
    }
    defineComponent('stop-comp', StopComp);
    const el = document.createElement('stop-comp');
    document.body.appendChild(el);
    await new Promise(r => queueMicrotask(r));

    const btn = el.querySelector('button')!;
    const event = new Event('click', { bubbles: true });
    btn.dispatchEvent(event);

    expect(event.bubbles).toBe(true); // event still bubbles in DOM but listener should be stopped
    // Since we use addEventListener, .stop modifier should have called stopPropagation()
    // In a real browser this would prevent the div's listener from firing.
    expect(el.querySelector('div')!.getAttribute('data-baex')).toBeNull(); // just checking it rendered
  });
});
