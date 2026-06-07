export type { PropertyDeclaration, PropertyValues } from './baex-element';
export { BaexElement, property, state } from './baex-element';
export type { SignalSubscriber } from './signals';
export { createSignal, getSignal, Signal, effect, watch, Computed, useSignal, useComputed, useEffect } from './signals';
export type { Binding, TemplateResult } from './template';
export { css, html } from './template';

export function defineComponent(
  tagName: string,
  elementClass: typeof BaexElement,
): void {
  if (customElements.get(tagName)) {
    return;
  }
  try {
    customElements.define(tagName, elementClass);
  } catch (e) {
    if (e instanceof DOMException && e.message.includes('already been used')) {
      return;
    }
    throw e;
  }
}
