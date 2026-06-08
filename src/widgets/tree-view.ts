import { BaexElement, defineComponent, html, createSignal, Signal } from '../framework/index.js';

interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
}

const TREE_DATA: TreeNode[] = [
  {
    id: 'root',
    label: 'src',
    type: 'folder',
    children: [
      {
        id: 'app',
        label: 'app',
        type: 'folder',
        children: [
          { id: 'app_ts', label: 'app.ts', type: 'file' },
          { id: 'nav_ts', label: 'nav.ts', type: 'file' },
        ],
      },
      {
        id: 'framework',
        label: 'framework',
        type: 'folder',
        children: [
          { id: 'signals_ts', label: 'signals.ts', type: 'file' },
          { id: 'template_ts', label: 'template.ts', type: 'file' },
          { 
            id: 'wasm', 
            label: 'wasm_core', 
            type: 'folder', 
            children: [
              { id: 'core_rs', label: 'core.rs', type: 'file' },
              { id: 'bridge_rs', label: 'bridge.rs', type: 'file' },
            ] 
          },
        ],
      },
      { id: 'index_ts', label: 'index.ts', type: 'file' },
    ],
  },
  {
    id: 'tests',
    label: 'tests',
    type: 'folder',
    children: [
      { id: 'signals_test', label: 'signals.test.ts', type: 'file' },
      { id: 'integration_test', label: 'integration.test.ts', type: 'file' },
    ],
  },
  { id: 'package_json', label: 'package.json', type: 'file' },
];

export class TreeView extends BaexElement {
  private _expandedNodes!: Signal<Set<string>>;

  constructor() {
    super();
    // Using a Set to track multiple open folders
    this._expandedNodes = createSignal('tree_expanded', new Set<string>(), this._cid);
  }

  onConnected() {
    this.track(this._expandedNodes, () => this.requestUpdate());
  }

  private _toggleNode = (id: string) => {
    const next = new Set(this._expandedNodes.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this._expandedNodes.value = next;
  };

  private _renderNode(node: TreeNode, depth: number = 0): any {
    const isExpanded = this._expandedNodes.value.has(node.id);
    const hasChildren = node.type === 'folder' && node.children && node.children.length > 0;
    
    return html`
      <div class="flex flex-col">
        <div 
          @click=${() => node.type === 'folder' && this._toggleNode(node.id)}
          class="flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.05] group ${node.type === 'folder' ? 'font-medium text-white/90' : 'text-gray-400'}"
          style="padding-left: ${depth * 20 + 8}px"
        >
          <span class="text-xs transition-transform duration-200 ${hasChildren ? (isExpanded ? 'rotate-90' : '') : 'opacity-0'}">
            ▶
          </span>
          <span class="text-sm">${node.type === 'folder' ? '📁' : '📄'} ${node.label}</span>
          ${node.type === 'file' ? html`<span class="ml-auto text-[10px] opacity-0 group-hover:opacity-50 transition-opacity text-gray-600">file</span>` : ''}
        </div>
        
        ${hasChildren && isExpanded ? html`
          <div class="flex flex-col">
            ${node.children!.map(child => this._renderNode(child, depth + 1))}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    return html`
      <div class="max-w-md mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
        <div class="flex items-center gap-2 mb-6 pb-4 border-b border-white/[0.05]">
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <h3 class="text-lg font-bold text-white">Project Explorer</h3>
        </div>
        <div class="space-y-1">
          ${TREE_DATA.map(node => this._renderNode(node))}
        </div>
      </div>
    `;
  }
}

defineComponent('baex-tree-view', TreeView);
