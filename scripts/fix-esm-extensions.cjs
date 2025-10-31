const fs = require('fs');
const path = require('path');

const esmDir = path.join(__dirname, '..', 'dist', 'esm');

function isRelative(spec) {
  return spec.startsWith('./') || spec.startsWith('../');
}

function ensureJs(spec) {
  if (spec.endsWith('.js') || spec.endsWith('.json') || spec.endsWith('.mjs')) return spec;
  return spec + '.js';
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // import ... from '...'
  code = code.replace(/(import\s+[^'"\n]+?from\s+)["'](\.{1,2}\/[^"']+)["']/g, (m, p1, p2) => {
    return p1 + '"' + ensureJs(p2) + '"';
  });

  // export ... from '...'
  code = code.replace(/(export\s+[^'"\n]*?from\s+)["'](\.{1,2}\/[^"']+)["']/g, (m, p1, p2) => {
    return p1 + '"' + ensureJs(p2) + '"';
  });

  // dynamic import('...')
  code = code.replace(/(import\(\s*["'])(\.{1,2}\/[^"']+)(["']\s*\))/g, (m, p1, p2, p3) => {
    return p1 + ensureJs(p2) + p3;
  });

  fs.writeFileSync(filePath, code);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) processFile(full);
  }
}

if (fs.existsSync(esmDir)) walk(esmDir);


