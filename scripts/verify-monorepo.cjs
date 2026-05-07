#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const requiredPaths = [
  'package.json',
  'scripts/run-dev.cjs',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.editorconfig',
  'packages/shared/package.json',
  'packages/shared/src/index.js',
  'infra/docker/docker-compose.dev.yml',
  '.github/workflows/ci.yml',
  'README.md'
];

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readJson(relPath) {
  const fullPath = path.join(root, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

let failed = false;

for (const relPath of requiredPaths) {
  if (!exists(relPath)) {
    process.stderr.write(`MISSING: ${relPath}\n`);
    failed = true;
  } else {
    process.stdout.write(`OK: ${relPath}\n`);
  }
}

if (exists('package.json')) {
  try {
    const pkg = readJson('package.json');
    if (!pkg.private) {
      process.stderr.write('WARN: package.json should be private=true for monorepo root.\n');
    }
    if (!pkg.scripts || !pkg.scripts.dev) {
      process.stderr.write('WARN: package.json missing scripts.dev.\n');
    }
  } catch (error) {
    process.stderr.write(`ERROR: cannot parse package.json (${error.message})\n`);
    failed = true;
  }
}

if (failed) {
  process.stderr.write('Verification failed. Run bootstrap script again or inspect missing files.\n');
  process.exit(1);
}

process.stdout.write('Verification passed.\n');
