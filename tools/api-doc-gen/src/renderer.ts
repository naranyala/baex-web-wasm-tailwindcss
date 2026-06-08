import { DocEntry } from './parser';

function parseMarkdown(text: string): string {
    let result = text.replace(/```(?:([a-z]*)\n)?([\s\S]*?)\n```/g, (_, lang, code) => {
        const language = lang || 'text';
        return `<div class="code-wrapper"><pre><code class="language-${language}">${escapeHtml(code)}</code></pre></div>`;
    });

    result = result.replace(/`([^`]+)`/g, (_, code) => {
        return `<code>${escapeHtml(code)}</code>`;
    });

    result = result.replace(/\n/g, '<br>');
    return result;
}

export function renderHtml(groupedEntries: Record<string, DocEntry[]>): string {
    const files = Object.keys(groupedEntries).sort();
    const allEntries = Object.values(groupedEntries).flat();
    
    const documentedCount = allEntries.filter(e => e.description).length;
    const undocumentedCount = allEntries.length - documentedCount;
    
    const content = files.map(filePath => `
        <div class="file-group">
            <h3 class="file-path">${filePath}</h3>
            ${groupedEntries[filePath].map(entry => `
                <section class="entry" id="${entry.uniqueId}" data-documented="${!!entry.description}">
                    <div class="entry-header">
                        <span class="type">${entry.type}</span>
                        <h2 class="name">${entry.name}</h2>
                    </div>
                    
                    ${entry.warnings.length > 0 ? `
                        <div class="warnings">
                            <strong>Documentation Gaps:</strong>
                            <ul>
                                ${entry.warnings.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <div class="description">${parseMarkdown(entry.description) || '<em>No description provided.</em>'}</div>
                    
                    ${entry.params && entry.params.length > 0 ? `
                        <div class="params">
                            <h3>Parameters</h3>
                            <ul>
                                ${entry.params.map(p => `
                                    <li class="${p.isDocumented ? '' : 'undocumented'}">
                                        <strong>${p.name}</strong> <small>${p.type || ''}</small> - ${parseMarkdown(p.description || '<em>No description.</em>')}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${entry.returns ? `
                        <div class="returns">
                            <h3>Returns</h3>
                            <p><strong>${entry.returns.type || ''}</strong> ${parseMarkdown(entry.returns.description || '<em>No description.</em>')}</p>
                        </div>
                    ` : ''}

                    ${entry.examples && entry.examples.length > 0 ? `
                        <div class="examples">
                            <h3>Examples</h3>
                            ${entry.examples.map(ex => `<div class="code-wrapper"><pre><code>${escapeHtml(ex)}</code></pre></div>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="footer">
                        <div class="footer-content">
                            <span class="footer-label">Source:</span>
                            <a href="file://${entry.filePath}" target="_blank" class="footer-path">${entry.filePath}</a>
                            <span class="footer-separator">|</span>
                            <span class="footer-label">Line:</span>
                            <span class="footer-line">${entry.lineNumber}</span>
                        </div>
                    </div>
                </section>
            `).join('')}
        </div>
    `).join('');

    const sidebar = Object.entries(groupedEntries).flatMap(([filePath, entries]) => 
        entries.map(e => `<li><a href="#${e.uniqueId}">${e.name}</a></li>`)
    ).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/tokyo-night-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        :root {
            --primary: #60a5fa;
            --bg: #0f172a;
            --nav-bg: #1e293b;
            --text: #f1f5f9;
            --text-muted: #94a3b8;
            --border: #334155;
            --entry-bg: #1e293b;
            --warn-bg: #451a03;
            --warn-border: #b45309;
            --warn-text: #fbbf24;
            --code-inline-bg: #334155;
        }
        body { 
            font-family: "Inter", -apple-system, system-ui, sans-serif; 
            line-height: 1.6; color: var(--text); margin: 0; 
            background: var(--bg); display: flex; min-height: 100vh;
        }
        
        nav { 
            position: fixed; width: 300px; height: 100vh; overflow-y: auto; 
            background: var(--nav-bg); border-right: 1px solid var(--border); padding: 2rem 1rem; 
            z-index: 100;
        }
        nav h1 { font-size: 1.25rem; margin-bottom: 1.5rem; padding: 0 1rem; color: var(--primary); }
        nav ul { list-style: none; padding: 0; margin: 0; }
        nav li { margin: 0.1rem 0; }
        nav a { 
            display: block; padding: 0.4rem 1rem; text-decoration: none; 
            color: var(--text-muted); font-size: 0.85rem; border-radius: 6px; transition: all 0.2s;
        }
        nav a:hover { background: #334155; color: var(--primary); }

        main { 
            margin-left: 300px; padding: 2rem 4rem; width: calc(100% - 300px); 
            max-width: 1200px;
        }
        
        .filter-bar {
            display: flex; gap: 1rem; margin-bottom: 2rem; align-items: center;
            position: sticky; top: 1rem; z-index: 10;
        }
        .filter-btn {
            background: var(--nav-bg); color: var(--text-muted); border: 1px solid var(--border);
            padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
            transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
        }
        .filter-btn.active {
            background: var(--primary); color: white; border-color: var(--primary);
        }
        .filter-btn .count {
            background: rgba(0,0,0,0.3); padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.8rem;
        }
        
        .file-group { margin-bottom: 4rem; }
        .file-path { 
            font-family: "JetBrains Mono", monospace; font-size: 1rem; 
            color: var(--primary); border-bottom: 1px solid var(--border); 
            padding-bottom: 0.5rem; margin-bottom: 2rem;
        }
        
        .entry { 
            background: var(--entry-bg); padding: 2rem; margin-bottom: 3rem; 
            border-radius: 12px; border: 1px solid var(--border); 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            width: 100%;
        }
        .entry-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .type { 
            background: #334155; color: #cbd5e1; padding: 0.2rem 0.6rem; 
            border-radius: 4px; font-size: 0.75rem; font-family: "JetBrains Mono", monospace; 
            text-transform: uppercase; font-weight: 600;
        }
        .name { margin: 0; font-size: 1.8rem; font-weight: 700; color: #fff; }
        
        .warnings { 
            background: var(--warn-bg); border: 1px solid var(--warn-border); 
            color: var(--warn-text); padding: 1rem; border-radius: 8px; 
            margin-bottom: 1.5rem; font-size: 0.9rem;
        }
        .warnings ul { margin: 0.5rem 0 0 1.2rem; padding: 0; }

        .description { font-size: 1.1rem; color: #cbd5e1; margin-bottom: 1.5rem; }
        .description code { 
            background: var(--code-inline-bg); color: #fff; padding: 0.2rem 0.4rem; 
            border-radius: 4px; font-family: "JetBrains Mono", monospace; font-size: 0.9em; 
        }
        
        .params, .returns, .examples { 
            margin-top: 1.5rem; padding: 1.25rem; background: #0f172a; 
            border-radius: 8px; border: 1px solid var(--border);
        }
        .params h3, .returns h3, .examples h3 { 
            margin-top: 0; font-size: 0.9rem; text-transform: uppercase; 
            color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 1rem;
        }
        .params ul { margin: 0; padding-left: 1.2rem; }
        .params li { margin-bottom: 0.5rem; }
        .undocumented { color: #64748b; font-style: italic; }
        
        .code-wrapper { margin: 1rem 0; border-radius: 8px; overflow: hidden; }
        pre { 
            margin: 0; padding: 1.25rem; overflow-x: auto; 
            font-size: 0.9rem; font-family: "JetBrains Mono", monospace; 
        }
        
        .footer { 
            margin-top: 2rem; font-size: 0.8rem; color: var(--text-muted); 
            text-align: right; border-top: 1px solid var(--border); padding-top: 1rem;
        }
        .footer-content {
            display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .footer-label { font-weight: 600; color: #64748b; }
        .footer-path { 
            color: var(--text-muted); text-decoration: none; 
            font-family: "JetBrains Mono", monospace; 
        }
        .footer-path:hover { color: var(--primary); }
        .footer-separator { color: var(--border); }
        .footer-line { font-family: "JetBrains Mono", monospace; color: var(--text); }

        @media (max-width: 1000px) {
            body { flex-direction: column; }
            nav { 
                position: relative; width: 100%; height: auto; 
                border-right: none; border-bottom: 1px solid var(--border); 
                padding: 1.5rem;
            }
            main { 
                margin-left: 0; padding: 1.5rem; width: 100%; 
            }
            .filter-bar { flex-direction: column; align-items: stretch; }
            .filter-btn { justify-content: center; }
            .entry { padding: 1.25rem; }
            .name { font-size: 1.5rem; }
            .footer-content { flex-direction: column; align-items: flex-end; gap: 0.2rem; }
            .footer-separator { display: none; }
        }
    </style>
</head>
<body>
    <nav>
        <h1>API Reference</h1>
        <ul>
            ${sidebar}
        </ul>
    </nav>
    <main>
        <div class="filter-bar">
            <button class="filter-btn active" onclick="filterDocs('all', this)">
                All <span class="count">${allEntries.length}</span>
            </button>
            <button class="filter-btn" onclick="filterDocs('documented', this)">
                Documented <span class="count">${documentedCount}</span>
            </button>
            <button class="filter-btn" onclick="filterDocs('undocumented', this)">
                Undocumented <span class="count">${undocumentedCount}</span>
            </button>
        </div>
        ${content || '<p>No documentation found. Start adding <code>///</code> or <code>/** ... </code> comments to your code!</p>'}
    </main>
    <script>
        function filterDocs(type, btn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const entries = document.querySelectorAll('.entry');
            entries.forEach(el => {
                const isDoc = el.getAttribute('data-documented') === 'true';
                if (type === 'all') el.style.display = 'block';
                else if (type === 'documented') el.style.display = isDoc ? 'block' : 'none';
                else if (type === 'undocumented') el.style.display = isDoc ? 'none' : 'block';
            });
            
            document.querySelectorAll('.file-group').forEach(group => {
                const hasVisible = group.querySelectorAll('.entry[style*="display: block"], .entry:not([style])').length > 0;
                group.style.display = hasVisible ? 'block' : 'none';
            });
        }

        document.addEventListener('DOMContentLoaded', (event) => {
            hljs.highlightAll();
        });
    </script>
</body>
</html>
    `;
}

function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
