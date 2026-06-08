import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseFile } from './parser';
import { validateEntry } from './validator';
import { renderHtml } from './renderer';

async function main() {
    const projectRoot = process.cwd();
    const outputFilePath = join(projectRoot, 'index.html');
    const directoriesToScan = ['src', 'crates'];
    
    // Ignore patterns for documentation scanning
    const ignorePatterns = [
        '\\.test\\.ts$',
        '\\.spec\\.ts$',
        '/tests/',
        '/node_modules/',
        '\\.d\\.ts$'
    ];

    const groupedEntries: Record<string, any[]> = {};
    let totalWarnings = 0;

    console.log('🚀 Generating robust API documentation...');

    function recursiveScan(dir: string) {
        const fullDir = join(projectRoot, dir);
        if (!existsSync(fullDir)) return;

        const files = readdirSync(fullDir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = join(fullDir, file.name);
            const relativePath = relative(projectRoot, fullPath);

            if (file.isDirectory()) {
                recursiveScan(join(dir, file.name));
            } else if (file.name.endsWith('.ts') || file.name.endsWith('.rs')) {
                // Filter out internal/test files
                if (ignorePatterns.some(pattern => new RegExp(pattern).test(relativePath))) {
                    continue;
                }

                const content = readFileSync(fullPath, 'utf-8');
                const { entries: fileEntries } = parseFile(content, relativePath);
                
                if (fileEntries.length === 0) continue;

                // Validate each entry
                for (const entry of fileEntries) {
                    const warnings = validateEntry(entry);
                    entry.warnings.push(...warnings);
                    totalWarnings += warnings.length;
                }

                // Sort entries within the file by name
                fileEntries.sort((a, b) => a.name.localeCompare(b.name));
                groupedEntries[relativePath] = fileEntries;
            }
        }
    }

    for (const dir of directoriesToScan) {
        recursiveScan(dir);
    }

    const html = renderHtml(groupedEntries);
    writeFileSync(outputFilePath, html);

    console.log(`\n✨ Done! API documentation generated at: ${outputFilePath}`);
    
    const totalEntries = Object.values(groupedEntries).flat().length;
    console.log(`Total files documented: ${Object.keys(groupedEntries).length}`);
    console.log(`Total entries: ${totalEntries}`);
    console.log(`Total documentation gaps found: ${totalWarnings}`);
    
    if (totalWarnings > 0) {
        console.warn('\n⚠️  Some documentation is missing or incomplete. Check index.html for details.');
    }
}

main().catch(console.error);
