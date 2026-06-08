import { BaexElement, defineComponent, html } from '../framework/index.js';
import { viewSignal, tabsSignal } from '../app/nav.js';

interface RagItem {
  category: string;
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
}

const RAG_ITEMS: RagItem[] = [
  { category: 'Data Ingestion', id: 'upload', name: 'Document Upload', desc: 'Manage sources', icon: '📁', color: 'blue' },
  { category: 'Data Ingestion', id: 'chunking', name: 'Chunking Strategy', desc: 'Size & Overlap', icon: '✂️', color: 'blue' },
  { category: 'Data Ingestion', id: 'embedding', name: 'Embedding Model', desc: 'Vectorization', icon: '🧬', color: 'blue' },
  { category: 'Data Ingestion', id: 'vector-db', name: 'Vector Store', desc: 'Index & Storage', icon: '🗄️', color: 'blue' },
  { category: 'Retrieval Strategy', id: 'query-rewrite', name: 'Query Optimizer', desc: 'Rewrite/Expand', icon: '🔍', color: 'purple' },
  { category: 'Retrieval Strategy', id: 'search-params', name: 'Search Params', desc: 'Top-K / Threshold', icon: '⚙️', color: 'purple' },
  { category: 'Retrieval Strategy', id: 'reranking', name: 'Reranking', desc: 'Cross-Encoders', icon: '🎯', color: 'purple' },
  { category: 'Retrieval Strategy', id: 'hybrid', name: 'Hybrid Search', desc: 'BM25 + Vector', icon: '⚖️', color: 'purple' },
  { category: 'Generation Engine', id: 'llm-picker', name: 'LLM Selector', desc: 'Model Choice', icon: '🤖', color: 'orange' },
  { category: 'Generation Engine', id: 'prompt-editor', name: 'System Prompt', desc: 'Templates', icon: '📝', color: 'orange' },
  { category: 'Generation Engine', id: 'gen-params', name: 'Gen Params', desc: 'Temp/Top-P', icon: '🎚️', color: 'orange' },
  { category: 'Generation Engine', id: 'context-window', name: 'Context Mgmt', desc: 'Pruning/Ranking', icon: '🖼️', color: 'orange' },
  { category: 'Evaluation & Obs', id: 'faithfulness', name: 'Faithfulness', desc: 'No Hallucinations', icon: '🛡️', color: 'green' },
  { category: 'Evaluation & Obs', id: 'relevance', name: 'Answer Relevance', desc: 'Accuracy', icon: '✅', color: 'green' },
  { category: 'Evaluation & Obs', id: 'logs', name: 'Query Logs', desc: 'Inspection', icon: '📜', color: 'green' },
  { category: 'Evaluation & Obs', id: 'metrics', name: 'System Metrics', desc: 'Cost & Latency', icon: '📊', color: 'green' },
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export class RagSystemMenu extends BaexElement {
  private _searchQuery = '';

  onConnected() {
    this.track(viewSignal, () => this.requestUpdate(true));
  }

  protected onAfterUpdate() {
    if (viewSignal.value === 'rag') {
      const input = this.querySelector('input') as HTMLInputElement;
      if (input) input.value = this._searchQuery;
      this._filterGrid();
    }
  }

  private _onSearchInput = (e: Event) => {
    this._searchQuery = (e.target as HTMLInputElement).value;
    this._filterGrid();
  };

  private _filterGrid() {
    const query = this._searchQuery.trim();
    const cards = this.querySelectorAll<HTMLElement>('.rag-card');
    let matchCount = 0;
    cards.forEach((card) => {
      const text = card.getAttribute('data-search') || '';
      const matches = !query || fuzzyMatch(text, query);
      card.style.display = matches ? '' : 'none';
      if (matches) matchCount++;
    });
    const counter = this.querySelector('.rag-filter-count');
    if (counter) counter.textContent = `${matchCount} / ${RAG_ITEMS.length}`;
    const empty = this.querySelector('.rag-filter-empty');
    if (empty) empty.style.display = matchCount === 0 ? '' : 'none';
  }

  private _openItem(item: RagItem) {
    const currentTabs = tabsSignal.value as { id: string; name: string }[];
    if (!currentTabs.some((t) => t.id === item.id)) {
      tabsSignal.value = [...currentTabs, { id: item.id, name: item.name }];
    }
    viewSignal.value = item.id;
  }

  render() {
    const currentView = viewSignal.value;

    if (currentView !== 'rag') {
      const item = RAG_ITEMS.find((i) => i.id === currentView);
      if (!item) {
        return html`<div class="min-h-screen bg-[#020917] p-8"><p class="text-gray-400 text-center mt-12">Not found</p></div>`;
      }
      return html`
        <div class="min-h-screen bg-[#020917] p-8">
          <div class="max-w-3xl mx-auto">
            <button
              @click=${() => { viewSignal.value = 'rag'; }}
              class="text-sm text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
            >← Back to Grid</button>
            <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8">
              <div class="flex items-center gap-4 mb-6">
                <span class="text-4xl">${item.icon}</span>
                <div>
                  <h2 class="text-2xl font-bold text-white">${item.name}</h2>
                  <p class="text-sm text-gray-400">${item.desc}</p>
                </div>
              </div>
              <div class="text-xs font-semibold text-${item.color}-400 uppercase tracking-wider">${item.category}</div>
              <div class="mt-8 p-6 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <p class="text-gray-500 text-sm">Configuration panel for <strong class="text-white">${item.name}</strong> will be available here.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="min-h-screen bg-[#020917] p-8">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-white mb-2">RAG System Orchestrator</h1>
            <p class="text-gray-400">Configure and manage your Retrieval-Augmented Generation pipeline</p>
          </div>

          <div class="relative mb-8 max-w-md mx-auto">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
            <input
              @input=${this._onSearchInput}
              placeholder="Search components..."
              class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
            />
            <span class="rag-filter-count absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">${RAG_ITEMS.length} / ${RAG_ITEMS.length}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${RAG_ITEMS.map((item) => html`
              <button
                @click=${() => this._openItem(item)}
                data-search="${item.name} ${item.desc} ${item.category} ${item.id}"
                class="rag-card text-left p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all group relative overflow-hidden"
              >
                <div class="absolute top-0 left-0 w-1 h-full bg-${item.color}-500"></div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="text-xl">${item.icon}</span>
                  <span class="text-sm font-bold text-white/90 group-hover:text-white">${item.name}</span>
                </div>
                <div class="text-[11px] text-gray-500 leading-relaxed mb-4">${item.desc}</div>
                <div class="text-[10px] font-semibold text-${item.color}-400 uppercase tracking-tighter opacity-60">
                  ${item.category}
                </div>
              </button>
            `)}
          </div>

          <p class="rag-filter-empty text-center text-gray-500 text-sm mt-12" style="display:none">No components match</p>
        </div>
      </div>
    `;
  }
}

defineComponent('baex-rag-menu', RagSystemMenu);
