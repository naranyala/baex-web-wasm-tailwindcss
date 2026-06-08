import { DocEntry } from './parser';

export function validateEntry(entry: DocEntry): string[] {
    const warnings: string[] = [];
    const signature = entry.fullSignature;

    // 1. Description Check
    if (!entry.description) {
        warnings.push('Missing description');
    } else if (entry.description.length < 10) {
        warnings.push('Description is too short (min 10 chars)');
    }

    // 2. Signature Analysis
    if (entry.type === 'function') {
        // Extract parameters inside parentheses (handles multi-line)
        const paramMatch = signature.match(/\(([\s\S]*?)\)/);
        if (paramMatch) {
            const paramsContent = paramMatch[1];
            
            // Split by comma, but ignore commas inside generics <...> or nested templates
            const sigParams: string[] = [];
            let depth = 0;
            let currentParam = '';
            
            for (const char of paramsContent) {
                if (char === '<') depth++;
                if (char === '>') depth--;
                if (char === ',' && depth === 0) {
                    sigParams.push(currentParam.trim());
                    currentParam = '';
                } else {
                    currentParam += char;
                }
            }
            if (currentParam.trim()) sigParams.push(currentParam.trim());

            for (const p of sigParams) {
                // Handle TS: param: type = default or Rust: param: type
                const paramName = p.split(':')[0].split('=')[0].trim();
                if (!paramName) continue;
                
                if (!entry.params.find(dp => dp.name === paramName)) {
                    warnings.push(`Missing @param documentation for: ${paramName}`);
                }
            }
        }

        // Return value check (Rust '->' or TS ': type' at the end of signature)
        // We look for the return indicator after the LAST closing parenthesis of the parameters
        const lastParenIndex = signature.lastIndexOf(')');
        if (lastParenIndex !== -1) {
            const afterParams = signature.slice(lastParenIndex + 1);
            const hasReturn = afterParams.includes('->') || (afterParams.includes(':') && !afterParams.includes('=>'));
            
            if (hasReturn && !entry.returns) {
                warnings.push('Function returns a value but missing @returns documentation');
            }
        } else {
            // For non-function types (structs, etc) we don't check return, 
            // but for functions without parens (weird case), we skip.
        }
    }

    return warnings;
}
