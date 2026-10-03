#!/usr/bin/env node
'use strict';
/**
 * npm run dev – startet Corporate Hub (3001) und Online-Shop (3002) gleichzeitig mit
 * automatischem Neustart bei Codeänderungen (node --watch). Templates werden in der
 * Entwicklung ohne Cache geladen, Änderungen an .njk-Dateien sind sofort sichtbar.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const apps = [
  { name: 'corporate', color: '\x1b[32m' },
  { name: 'shop', color: '\x1b[33m' },
];
const children = [];

for (const app of apps) {
  const child = spawn(
    process.execPath,
    ['--watch', path.join(app.name, 'server.js')],
    { cwd: ROOT, env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const prefix = `${app.color}[${app.name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) out.write(`${prefix}${line}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${prefix}beendet (Code ${code})`));
  children.push(child);
}

const stop = () => {
  for (const c of children) c.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500).unref();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
