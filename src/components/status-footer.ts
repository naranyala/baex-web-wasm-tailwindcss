import { html, defineComponent, BaexElement } from '../framework/index.js';

class StatusFooterElement extends BaexElement {
  render() {
    const primitives = (window as any).baexPrimitives || [];
    const utils = Object.keys((window as any).utils || {});
    
    return html`
      <footer style="position: fixed; bottom: 0; left: 0; width: 100%; height: 24px; background: #222; color: #ddd; display: flex; align-items: center; padding: 0 10px; font-size: 11px; z-index: 9999; border-top: 1px solid #444;">
        <span><strong>BAEX API:</strong> ${primitives.length} Primitives | ${utils.length} Utility Functions</span>
      </footer>
    `;
  }
}

defineComponent('baex-status-footer', StatusFooterElement);
