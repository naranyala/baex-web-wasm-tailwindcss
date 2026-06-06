import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

export async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'javascript', 'rust', 'json', 'css', 'html'],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, lang: string = 'typescript') {
  try {
    const h = await getHighlighter();
    return h.codeToHtml(code, {
      lang,
      theme: 'github-dark',
    });
  } catch (e) {
    console.error('Shiki highlighting failed:', e);
    return `<pre><code>${code}</code></pre>`;
  }
}
