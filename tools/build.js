#!/usr/bin/env node
/* Concatenates src/ into a single self-contained exmafia.html */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSDIR = path.join(ROOT, 'src', 'js');
const CSSDIR = path.join(ROOT, 'src', 'css');
const OUT = path.join(ROOT, 'exmafia.html');

function readAllSorted(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort()
    .map(f => ({ name: f, body: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

const cssFiles = readAllSorted(CSSDIR, '.css');
const jsFiles = readAllSorted(JSDIR, '.js');

if (!jsFiles.length) { console.error('no js sources'); process.exit(1); }

const css = cssFiles.map(f => `/* ===== ${f.name} ===== */\n${f.body}`).join('\n\n');
const js = jsFiles.map(f => `/* ===== ${f.name} ===== */\n${f.body}`).join('\n\n');

const tpl = fs.readFileSync(path.join(ROOT, 'src', 'index.template.html'), 'utf8');

const html = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => `(function(){\n${js}\n})();`);

fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`built ${path.relative(ROOT, OUT)}  ${kb} KB  (${cssFiles.length} css, ${jsFiles.length} js)`);
for (const f of jsFiles) {
  const lines = f.body.split('\n').length;
  console.log(`   ${String(lines).padStart(6)}  ${f.name}`);
}
