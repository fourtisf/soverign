// SOVEREIGN build — concatenates src/ into one self-contained dist/index.html
// Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = f => readFileSync(join(root, 'src', f), 'utf8');
const JS_ORDER = ['01_core.js', '02_geometry.js', '03_simulation.js', '04_ui.js', '05_progression.js', '06_main.js'];

const html = [
  src('00_shell.html'),
  '<script type="module">',
  ...JS_ORDER.map(src),
  '</script>',
  '</body></html>',
].join('\n');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(1)} KB`);
