export interface DocEntry {
    name: string;
    uniqueId: string;
    type: 'function' | 'class' | 'struct' | 'variable' | 'module';
    description: string;
    params: { name: string; description: string; type?: string; isDocumented: boolean }[];
    returns: { description: string; type?: string; isDocumented: boolean } | null;
    examples: string[];
    filePath: string;
    lineNumber: number;
    warnings: string[];
    fullSignature: string;
}

export interface ParseResult {
    entries: DocEntry[];
}

export function parseFile(content: string, filePath: string): ParseResult {
    const entries: DocEntry[] = [];
    const lines = content.split('\n');
    
    let i = 0;
    while (i < lines.length) {
        const rawLine = lines[i];
        const line = rawLine.trim();

        if (!line) {
            i++;
            continue;
        }

        // 1. Check for Doc Block
        if (line.startsWith('///') || line.startsWith('/**')) {
            const isRust = line.startsWith('///');
            let docBlock = '';
            
            if (isRust) {
                while (i < lines.length && lines[i].trim().startsWith('///')) {
                    docBlock += lines[i].trim().slice(3) + '\n';
                    i++;
                }
            } else {
                while (i < lines.length && !lines[i].includes('*/')) {
                    docBlock += lines[i].trim().slice(line.startsWith('/**') ? 3 : 0) + '\n';
                    i++;
                }
                if (i < lines.length) {
                    docBlock += lines[i].trim().slice(0, lines[i].indexOf('*/')) + '\n';
                    i++;
                }
            }

            const { signature, endLine } = captureSignature(lines, i);
            if (signature) {
                const entry = parseDocBlock(docBlock, signature, filePath, i + 1);
                if (entry) entries.push(entry);
                i = endLine;
            } else {
                i++;
            }
        } 
        // 2. Check for Public/Exported Definition without Doc Block
        else if (isPublicDefinition(line)) {
            const { signature, endLine } = captureSignature(lines, i);
            if (signature) {
                const entry = parseDocBlock('', signature, filePath, i + 1);
                if (entry) entries.push(entry);
                i = endLine;
            } else {
                i++;
            }
        } else {
            i++;
        }
    }

    return { entries };
}

function isPublicDefinition(line: string): boolean {
    // Only capture top-level public API to avoid internal noise
    const patterns = [
        /^(?:pub\s*(?:\([a-z]*\))?\s*)?(?:fn|struct|enum|trait)\s+([a-zA-Z0-9_]+)/,
        /^export\s+(?:async\s+)?(?:function|class|const|let|var|type|enum|interface)\s+([a-zA-Z0-9_]+)/,
        /^export\s+default\s+([a-zA-Z0-9_]+)/,
    ];
    
    // To be a "public" definition without a doc block, it MUST be explicitly marked as pub or export
    // otherwise we avoid listing every internal variable in the project.
    return patterns.some(p => p.test(line));
}

function captureSignature(lines: string[], startIdx: number) {
    let signature = '';
    let foundEnd = false;
    let bracketStack: string[] = [];
    let i = startIdx;

    // Limit search to avoid consuming the whole file on a broken signature
    const maxLines = 20;
    let linesRead = 0;

    while (i < lines.length && !foundEnd && linesRead < maxLines) {
        const sigLine = lines[i];
        
        for (const char of sigLine) {
            if (char === '(' || char === '{' || char === '[') {
                bracketStack.push(char);
            } else if (char === ')') {
                if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '(') bracketStack.pop();
            } else if (char === '}') {
                if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '{') {
                    bracketStack.pop();
                    if (bracketStack.length === 0) {
                        foundEnd = true;
                        break;
                    }
                }
            } else if (char === ']') {
                if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '[') bracketStack.pop();
            }
        }
        
        if (!foundEnd && sigLine.includes(';') && bracketStack.length === 0) {
            foundEnd = true;
        }
        
        signature += sigLine + ' ';
        i++;
        linesRead++;
    }

    // If we hit the limit without finding an end, it's likely not a simple definition
    if (!foundEnd && linesRead >= maxLines) {
        return { signature: null, endLine: startIdx };
    }

    return { 
        signature: signature.trim() || null, 
        endLine: i 
    };
}

function parseDocBlock(docBlock: string, signature: string, filePath: string, lineNumber: number): DocEntry | null {
    const lines = docBlock.split('\n').map(l => l.trim());
    const description: string[] = [];
    const paramsMap = new Map<string, { description: string, type?: string }>();
    const examples: string[] = [];
    let returnsInfo: { description: string, type?: string } | null = null;

    let currentExample: string[] = [];
    let inExample = false;

    for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('@param')) {
            inExample = false;
            const match = line.match(/@param\s+(\w+)(?:\s+([^:]+):)?\s+(.*)/);
            if (match) paramsMap.set(match[1], { type: match[2], description: match[3] });
        } else if (line.startsWith('@returns') || line.startsWith('@return')) {
            inExample = false;
            const match = line.match(/@(?:returns|return)\s+([^:]+):?\s*(.*)/);
            if (match) returnsInfo = { type: match[1].includes(':') ? match[1].split(':')[0] : undefined, description: match[2] || match[1] };
            else returnsInfo = { description: line.slice(line.indexOf(' ') + 1).trim() };
        } else if (line.startsWith('@example')) {
            inExample = true;
            currentExample = [];
        } else if (inExample) {
            currentExample.push(line);
        } else if (!line.startsWith('@')) {
            description.push(line);
        }
    }

    if (currentExample.length > 0) examples.push(currentExample.join('\n'));

    const strippedSignature = signature.replace(/#\[.*?\]\s*/g, '');
    const nameMatch = strippedSignature.match(/(?:pub\s*\([a-z]*\)\s*)?(?:fn|function|class|struct|const|let|var|pub\s+fn|pub\s+struct)\s+([a-zA-Z0-9_]+)/);
    const name = (nameMatch ? nameMatch[1] : strippedSignature.split(/[ (]/)[0]) || 'unknown';

    let type: DocEntry['type'] = 'variable';
    if (signature.includes('fn ') || signature.includes('function ')) type = 'function';
    else if (signature.includes('class ')) type = 'class';
    else if (signature.includes('struct ')) type = 'struct';

    const entry: DocEntry = {
        name,
        uniqueId: `${name}-${filePath.replace(/[\/\\.]/g, '_')}`,
        type,
        description: description.join('\n').trim(),
        params: [],
        returns: null,
        examples,
        filePath,
        lineNumber,
        warnings: [],
        fullSignature: signature
    };

    paramsMap.forEach((val, key) => {
        entry.params.push({ name: key, description: val.description, type: val.type, isDocumented: true });
    });

    if (returnsInfo) {
        entry.returns = { description: returnsInfo.description, type: returnsInfo.type, isDocumented: true };
    }

    return entry;
}
