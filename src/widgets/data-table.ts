import { BaexElement, defineComponent, html, createSignal } from '../framework/index.js';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  joined: string;
}

const DATA: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', joined: '2023-01-15' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', joined: '2023-03-22' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Viewer', joined: '2022-11-05' },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', joined: '2023-06-10' },
  { id: 5, name: 'Ethan Hunt', email: 'ethan@example.com', role: 'Editor', joined: '2023-08-19' },
  { id: 6, name: 'Fiona Glenanne', email: 'fiona@example.com', role: 'Viewer', joined: '2023-02-28' },
  { id: 7, name: 'George Costanza', email: 'george@example.com', role: 'Viewer', joined: '2022-05-12' },
  { id: 8, name: 'Hannah Abbott', email: 'hannah@example.com', role: 'Editor', joined: '2023-09-01' },
];

export class DataTable extends BaexElement {
  private _sortCol = createSignal<keyof User | null>(null);
  private _sortDir = createSignal<'asc' | 'desc'>('asc');
  private _data = createSignal([...DATA]);

  onConnected() {
    this.track(this._sortCol, () => this.requestUpdate());
    this.track(this._sortDir, () => this.requestUpdate());
    this.track(this._data, () => this.requestUpdate());
  }

  private _handleSort(col: keyof User) {
    if (this._sortCol.value === col) {
      this._sortDir.value = this._sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortCol.value = col;
      this._sortDir.value = 'asc';
    }

    const sorted = [...this._data.value].sort((a, b) => {
      const valA = a[col];
      const valB = b[col];
      const modifier = this._sortDir.value === 'asc' ? 1 : -1;

      if (valA < valB) return -1 * modifier;
      if (valA > valB) return 1 * modifier;
      return 0;
    });
    this._data.value = sorted;
  }

  private _getSortIcon(col: keyof User) {
    if (this._sortCol.value !== col) return '↕️';
    return this._sortDir.value === 'asc' ? '↑' : '↓';
  }

  render() {
    return html`
      <div class="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-white/[0.08] bg-white/[0.04]">
              ${(['name', 'email', 'role', 'joined'] as const).map((col) => html`
                <th 
                  @click=${() => this._handleSort(col)} 
                  class="px-6 py-4 font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors group"
                >
                  <div class="flex items-center gap-2">
                    ${col.charAt(0).toUpperCase() + col.slice(1)}
                    <span class="text-[10px] opacity-50 group-hover:opacity-100">${this._getSortIcon(col)}</span>
                  </div>
                </th>
              `)}
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            ${this._data.value.map((user) => html`
              <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="px-6 py-4 text-white font-medium">${user.name}</td>
                <td class="px-6 py-4 text-gray-400">${user.email}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'Admin' ? 'bg-blue-500/20 text-blue-400' : 
                    user.role === 'Editor' ? 'bg-purple-500/20 text-purple-400' : 
                    'bg-gray-500/20 text-gray-400'
                  }">
                    ${user.role}
                  </span>
                </td>
                <td class="px-6 py-4 text-gray-500">${user.joined}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

defineComponent('baex-data-table', DataTable);
