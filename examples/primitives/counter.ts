import { html, createSignal, defineComponent, BaexElement } from '../../src/framework/index.js';

// Counter component showcasing Signal usage
class CounterElement extends BaexElement {
  static properties = {
    count: { type: Number, attribute: true },
  };

  private countSignal = createSignal('counter', 0);

  render() {
    return html`
      <div>
        <p>Count: ${this.countSignal}</p>
        <button @click=${() => this.increment()}>Increment</button>
      </div>
    `;
  }

  increment() {
    const current = (this.countSignal as any).value;
    (this.countSignal as any).value = current + 1;
  }
}

defineComponent('baex-counter', CounterElement);
