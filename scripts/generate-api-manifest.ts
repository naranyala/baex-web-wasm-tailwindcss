import fs from 'node:fs';
import path from 'node:path';

const filesToScan = [
  path.resolve(process.cwd(), 'crates/web-core/src/lib.rs'),
  path.resolve(process.cwd(), 'crates/web-utils/src/lib.rs')
];

function extractFunctions(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Regex to match #[wasm_bindgen] or #[wasm_bindgen(...)] and the following pub fn name
  const regex = /#\[wasm_bindgen(?:|\(.*?\))\]\s+pub fn\s+(\w+)/g;
  const matches = [...content.matchAll(regex)];
  return matches.map(m => m[1]);
}

const primitives = extractFunctions(filesToScan[0]);
const utils = extractFunctions(filesToScan[1]);

const manifest = { primitives, utils };
fs.writeFileSync('src/api-manifest.json', JSON.stringify(manifest, null, 2));
console.log('API manifest generated.');
