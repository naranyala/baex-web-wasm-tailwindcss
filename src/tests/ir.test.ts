import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BaexElement, defineComponent, html } from '../framework/index.js';
import { setupWasm } from './setup.js';

describe('Framework Intermediate Representation (IR)', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  describe('Layer 1: Blueprint', () => {
    it('generates valid structural metadata for simple templates', () => {
      const result = html`<div>Hello</div>`;
      expect(result.blueprint).toBeDefined();
      expect(result.blueprint.rawHtml).toBe('<div>Hello</div>');
      expect(result.blueprint.version).toBe('1.0');
    });

    it('propagates blueprint through nested templates', () => {
      const inner = html`<span>Inner</span>`;
      const outer = html`<div>${inner}</div>`;
      
      expect(outer.blueprint).toBeDefined();
      expect(outer.blueprint.rawHtml).toContain('<span>Inner</span>');
    });

    it('handles complex blueprints with bindings', () => {
      const val = 'test';
      const result = html`<div .prop=${val}></div>`;
      
      expect(result.blueprint.rawHtml).toContain('data-baex="b');
      expect(result.bindings.length).toBe(1);
    });
  });

  describe('Layer 2: Binding Set', () => {
    it('assigns unique markers to multiple bindings', () => {
      const result = html`<div .p1=${1} .p2=${2} @click=${() => {}}></div>`;
      const markers = result.bindings.map(b => b.marker);
      const uniqueMarkers = new Set(markers);
      
      expect(markers.length).toBe(3);
      expect(uniqueMarkers.size).toBe(3);
    });

    it('resolves signal values lazily in bindings', () => {
      // Create a dummy signal-like object
      const signal = { value: 'initial' };
      const result = html`<div .val=${signal}></div>`;
      
      const binding = result.bindings.find(b => b.propName === 'val');
      expect(binding?.value).toBe('initial');
      
      // Change signal value - the binding in the result was already resolved 
      // because 'html' currently resolves signals immediately.
      // This test documents the current behavior (EAGER resolution).
      signal.value = 'updated';
      expect(binding?.value).toBe('initial'); 
    });
  });

  describe('Layer 3 & 4: Patch Set & Node Map', () => {
    class IRTestElement extends BaexElement {
      static properties = {
        text: { type: String },
        count: { type: Number },
      };
      text = 'init';
      count = 0;
      render() {
        return html`
          <div>
            <span .text=${this.text}></span>
            <span .count=${this.count}></span>
          </div>
        `;
      }
    }
    defineComponent('ir-test-el', IRTestElement);

    it('establishes correct NodeMap on initial render', async () => {
      const el = document.createElement('ir-test-el') as IRTestElement;
      document.body.appendChild(el);
      await new Promise(r => queueMicrotask(r));

      // Access private _nodeMap using any
      const nodeMap = (el as any)._nodeMap as Map<string, Node>;
      expect(nodeMap.size).toBe(2);
      
      const markers = Array.from(nodeMap.keys());
      markers.forEach(marker => {
        expect(el.querySelector(`[data-baex="${marker}"]`)).toBeTruthy();
      });

      document.body.removeChild(el);
    });

    it('emits precise PatchSets for specific property changes', async () => {
      const el = document.createElement('ir-test-el') as IRTestElement;
      document.body.appendChild(el);
      await new Promise(r => queueMicrotask(r)); // Wait for connectedCallback render

      // Use a spy to track how many times _applyPatches is called and with what
      const applyPatchesSpy = vi.spyOn((el as any), '_applyPatches');

      el.text = 'updated';
      await new Promise(r => queueMicrotask(r)); // Wait for property update render

      expect(applyPatchesSpy).toHaveBeenCalled();
      const patches = applyPatchesSpy.mock.calls[0][0];
      expect(patches.length).toBe(1);
      expect(patches[0].propName).toBe('text');
      expect(patches[0].value).toBe('updated');

      document.body.removeChild(el);
    });

    it('prevents unnecessary patches when value is unchanged', async () => {
      const el = document.createElement('ir-test-el') as IRTestElement;
      document.body.appendChild(el);
      await new Promise(r => queueMicrotask(r));

      const applyPatchesSpy = vi.spyOn((el as any), '_applyPatches');

      el.text = 'init'; // same value
      await new Promise(r => queueMicrotask(r));

      expect(applyPatchesSpy).not.toHaveBeenCalled();

      document.body.removeChild(el);
    });

    it('maintains NodeMap integrity after full re-render', async () => {
      const el = document.createElement('ir-test-el') as IRTestElement;
      document.body.appendChild(el);
      await new Promise(r => queueMicrotask(r));

      const firstMap = new Map((el as any)._nodeMap);
      
      el.requestUpdate(true); // Force full render
      await new Promise(r => queueMicrotask(r));

      const secondMap = (el as any)._nodeMap;
      expect(secondMap.size).toBe(firstMap.size);
      
      // Since markers are currently unstable (global counter), we check if the 
      // number of bindings is the same and they are still linked to elements.
      const secondMarkers = Array.from(secondMap.keys());
      secondMarkers.forEach(marker => {
        expect(el.querySelector(`[data-baex="${marker}"]`)).toBeTruthy();
      });
    });
  });
});
