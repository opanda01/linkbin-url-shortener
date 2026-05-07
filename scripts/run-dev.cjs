#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function has(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function run(command, args) {
  return spawn(command, args, { cwd: root, stdio: 'inherit', shell: true });
}

const useMigratedLayout = has('apps/api/package.json') && has('apps/web/package.json');
const api = useMigratedLayout
  ? run('npm', ['run', 'dev', '--workspace', 'api'])
  : run('npm', ['--prefix', 'backend', 'run', 'dev']);
const web = useMigratedLayout
  ? run('npm', ['run', 'dev', '--workspace', 'web'])
  : run('npm', ['--prefix', 'frontend', 'run', 'dev']);

let exiting = false;
function shutdown(code) {
  if (exiting) return;
  exiting = true;
  if (!api.killed) api.kill('SIGINT');
  if (!web.killed) web.kill('SIGINT');
  process.exit(code);
}

api.on('exit', (code) => shutdown(code || 0));
web.on('exit', (code) => shutdown(code || 0));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
