import { BaexElement, defineComponent, html } from '../framework/index.js';

interface RagItem {
  category: string;
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
}

const RAG_ITEMS: RagItem[] = [
  // Ingestion
  { category: 'Data Ingestion', id: 'upload', name: 'Document Upload', desc: 'Manage sources', icon: '📁', color: 'blue' },
  { category: 'Data Ingestion', id: 'chunking', name: 'Chunking Strategy', desc: 'Size & Overlap', icon: '✂️', color: 'blue' },
  { category: 'Data Ingestion', id: 'embedding', name: 'Embedding Model', desc: 'Vectorization', icon: '🧬', color: 'blue' },
  { category: 'Data Ingestion', id: 'vector-db', name: 'Vector Store', desc: 'Index & Storage', icon: '🗄️', color: 'blue' },
  // Retrieval
  { category: 'Retrieval Strategy', id: 'query-rewrite', name: 'Query Optimizer', desc: 'Rewrite/Expand', icon: '🔍', color: 'purple' },
  { category: 'Retrieval Strategy', id: 'search-params', name: 'Search Params', desc: 'Top-K / Threshold', icon: '⚙️', color: 'purple' },
  { category: 'Retrieval Strategy', id: 'reranking', name: 'Reranking', desc: 'Cross-Encoders', icon: '🎯', color: 'purple' },
  { category: 'Retrieval Strategy', id: 'hybrid', name: 'Hybrid Search', desc: 'BM25 + Vector', icon: '⚖️', color: 'purple' },
  // Generation
  { category: 'Generation Engine', id: 'llm-picker', name: 'LLM Selector', desc: 'Model Choice', icon: '🤖', color: 'orange' },
  { category: 'Generation Engine', id: 'prompt-editor', name: 'System Prompt', desc: 'Templates', icon: '📝', color: 'orange' },
  { category: 'Generation Engine', id: 'gen-params', name: 'Gen Params', desc: 'Temp/Top-P', icon: '🎚️', color: 'orange' },
  { category: 'Generation Engine', id: 'context-window', name: 'Context Mgmt', desc: 'Pruning/Ranking', icon: '🖼️', color: 'orange' },
  // Evaluation
  { category: 'Evaluation & Obs', id: 'faithfulness', name: 'Faithfulness', desc: 'No Hallucinations', icon: '🛡️', color: 'green' },
  { category: 'Evaluation & Obs', id: 'relevance', name: 'Answer Relevance', desc: 'Accuracy', icon: '✅', color: 'green' },
  { category: 'Evaluation & Obs', id: 'logs', name: 'Query Logs', desc: 'Inspection', icon: '📜', color: 'green' },
  { category: 'Evaluation & Obs', id: 'metrics', name: 'System Metrics', desc: 'Cost & Latency', icon: '📊', color: 'green' },
];

export class RagSystemMenu extends BaexElement {
  render() {
    return html`
      <div class="min-h-screen bg-[#020917] flex items-center justify-center p-8">
        <div class="max-w-5xl w-full">
          <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-white mb-4">RAG System Orchestrator</h1>
            <p class="text-gray-400 text-lg">Configure and manage your Retrieval-Augmented Generation pipeline</p>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${RAG_ITEMS.map(item => html`
              <button 
                @click=${() => console.log('Navigating to:', item.id)}
                class="text-left p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all group relative overflow-hidden"
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
        </div>
      </div>
    `;
  }
}

defineComponent('baex-rag-menu', RagSystemMenu);
