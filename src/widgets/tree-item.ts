import { BaexElement, defineComponent, html } from '../framework/index.js';
import { property } from '../framework/baex-element.js';

export interface TreeItem {
  label: string;
  children?: TreeItem[];
  type: 'folder' | 'file';
}

export class TreeItemElement extends BaexElement {
  @property({ type: String }) label = '';
  @property({ type: String }) type = 'file';
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) children: TreeItem[] = [];

  render() {
    const isFolder = this.type === 'folder';
    const hasChildren = this.children && this.children.length > 0;
    
    return html`
      <div class="ml-2">
        <div 
          class="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
          @click=${() => {
            if (isFolder) {
              this.open = !this.open;
            }
          }}
        >
          <span class="opacity-50">${isFolder ? '📁' : '📄'}</span>
          <span class="text-xs">${this.label}</span>
        </div>
        ${this.open && isFolder && hasChildren ? html`
          <div class="ml-4 border-l border-white/10 pl-2">
            ${this.children.map(child => html`
              <baex-tree-item 
                label="${child.label}" 
                type="${child.type}" 
                children='${JSON.stringify(child.children || [])}'
              ></baex-tree-item>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }
}

defineComponent('baex-tree-item', TreeItemElement);

