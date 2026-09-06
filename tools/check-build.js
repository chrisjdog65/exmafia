#!/usr/bin/env node
/* Fails if exmafia.html is stale relative to src/. The built file is the
   deliverable, so it must never lag the sources it was made from. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'exmafia.html');
const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'pipe' });
const after = fs.readFileSync(OUT, 'utf8');

if (before !== after) {
  console.error('STALE BUILD: exmafia.html did not match src/. It has been rebuilt — commit it.');
  process.exit(1);
}
console.log('build is current (' + (Buffer.byteLength(after) / 1024).toFixed(1) + ' KB)');
