import { html, createSignal, defineComponent, BaexElement } from '../../src/framework/index.js';

class ThemeToggleElement extends BaexElement {
  private isDark = createSignal('isDark', false);

  render() {
    return html`
      <div class=${(this.isDark as any).value ? 'dark' : 'light'}>
        <p>Theme: ${(this.isDark as any).value ? 'Dark' : 'Light'}</p>
        <button ?disabled=${(this.isDark as any).value} @click=${() => this.toggle()}>Toggle</button>
      </div>
    `;
  }

  toggle() {
    (this.isDark as any).value = !(this.isDark as any).value;
  }
}

defineComponent('baex-theme-toggle', ThemeToggleElement);
