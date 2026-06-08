import { BaexElement, defineComponent, html } from '../framework/index.js';
import '../rag/rag-menu.js';
import './nav.js';

export class AppElement extends BaexElement {
  render() {
    return html`
      <baex-nav></baex-nav>
      <div class="min-h-screen bg-[#020917] pt-12">
        <baex-rag-menu></baex-rag-menu>
      </div>
    `;
  }
}

defineComponent('baex-app', AppElement);
