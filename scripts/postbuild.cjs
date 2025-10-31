// Ensure CommonJS semantics inside dist/cjs by setting type to commonjs
const fs = require('fs');
const path = require('path');

const cjsDir = path.join(__dirname, '..', 'dist', 'cjs');
fs.mkdirSync(cjsDir, { recursive: true });
fs.writeFileSync(
  path.join(cjsDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2)
);


