import { BaexElement, defineComponent, html } from '../framework/index.js';
import { property } from '../framework/baex-element.js';
import { TreeItem } from './tree-item.js';

export class TreeView extends BaexElement {
  @property({ type: Array }) data: TreeItem[] = [];
  @property({ type: String }) selectedKey: string | null = null;

  render() {
    if (!this.data || this.data.length === 0) {
      return html`<div class="text-sm text-gray-500 p-4 italic">No data available</div>`;
    }
    return html`
      <div class="text-sm font-mono text-gray-400 p-2">
        ${this.data.map(item => html`
          <baex-tree-item 
            label="${item.label}" 
            type="${item.type}" 
            children='${JSON.stringify(item.children || [])}'
          ></baex-tree-item>
        `)}
      </div>
    `;
  }
}

defineComponent('baex-tree-view', TreeView);

