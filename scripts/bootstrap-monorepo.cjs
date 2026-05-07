#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const migrate = args.has('--migrate-apps');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function ensureDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    return;
  }

  if (dryRun) {
    log(`[dry-run] mkdir ${path.relative(root, dirPath)}`);
    return;
  }

  fs.mkdirSync(dirPath, { recursive: true });
  log(`created dir ${path.relative(root, dirPath)}`);
}

function writeFileIfNeeded(filePath, content) {
  const exists = fs.existsSync(filePath);
  if (exists && !force) {
    log(`skip file ${path.relative(root, filePath)} (exists)`);
    return;
  }

  if (dryRun) {
    const mode = exists ? 'overwrite' : 'create';
    log(`[dry-run] ${mode} file ${path.relative(root, filePath)}`);
    return;
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  log(`${exists ? 'updated' : 'created'} file ${path.relative(root, filePath)}`);
}

function moveIfPossible(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) {
    log(`skip move ${path.relative(root, fromPath)} -> ${path.relative(root, toPath)} (source missing)`);
    return;
  }

  if (fs.existsSync(toPath)) {
    log(`skip move ${path.relative(root, fromPath)} -> ${path.relative(root, toPath)} (target exists)`);
    return;
  }

  if (dryRun) {
    log(`[dry-run] move ${path.relative(root, fromPath)} -> ${path.relative(root, toPath)}`);
    return;
  }

  ensureDir(path.dirname(toPath));
  fs.renameSync(fromPath, toPath);
  log(`moved ${path.relative(root, fromPath)} -> ${path.relative(root, toPath)}`);
}

function main() {
  log('Bootstrapping monorepo skeleton...');

  const baseDirs = [
    path.join(root, 'packages', 'shared', 'src'),
    path.join(root, 'infra', 'docker'),
    path.join(root, 'infra', 'scripts'),
    path.join(root, '.github', 'workflows')
  ];

  baseDirs.forEach(ensureDir);

  if (migrate) {
    ensureDir(path.join(root, 'apps'));
    moveIfPossible(path.join(root, 'backend'), path.join(root, 'apps', 'api'));
    moveIfPossible(path.join(root, 'frontend'), path.join(root, 'apps', 'web'));
  } else {
    log('migration disabled (use --migrate-apps to move backend/frontend into apps/)');
  }

  const workspaceGlobs = migrate
    ? ['apps/*', 'packages/*']
    : ['backend', 'frontend', 'packages/*'];

  const rootPackage = {
    name: 'linkbin',
    private: true,
    version: '0.1.0',
    workspaces: migrate ? ['apps/*', 'packages/*'] : ['backend', 'frontend', 'packages/*'],
    scripts: migrate
      ? {
          dev: 'node scripts/run-dev.cjs',
          'dev:api': 'npm run dev --workspace api',
          'dev:web': 'npm run dev --workspace web',
          lint: 'npm run lint --workspaces --if-present',
          build: 'npm run build --workspaces --if-present',
          test: 'npm run test --workspaces --if-present',
          'bootstrap:verify': 'node scripts/verify-monorepo.cjs'
        }
      : {
          dev: 'node scripts/run-dev.cjs',
          'dev:api': 'npm --prefix backend run dev',
          'dev:web': 'npm --prefix frontend run dev',
          lint: 'npm --prefix frontend run lint',
          build: 'npm --prefix frontend run build',
          test: 'npm --prefix backend run test',
          'bootstrap:verify': 'node scripts/verify-monorepo.cjs'
        }
  };

  writeFileIfNeeded(
    path.join(root, 'package.json'),
    `${JSON.stringify(rootPackage, null, 2)}\n`
  );

  writeFileIfNeeded(
    path.join(root, 'scripts', 'run-dev.cjs'),
    [
      '#!/usr/bin/env node',
      '',
      "const { spawn } = require('child_process');",
      "const fs = require('fs');",
      "const path = require('path');",
      '',
      "const root = path.resolve(__dirname, '..');",
      '',
      'function has(relPath) {',
      '  return fs.existsSync(path.join(root, relPath));',
      '}',
      '',
      'function run(command, args) {',
      "  return spawn(command, args, { cwd: root, stdio: 'inherit', shell: true });",
      '}',
      '',
      "const useMigratedLayout = has('apps/api/package.json') && has('apps/web/package.json');",
      "const api = useMigratedLayout",
      "  ? run('npm', ['run', 'dev', '--workspace', 'api'])",
      "  : run('npm', ['--prefix', 'backend', 'run', 'dev']);",
      "const web = useMigratedLayout",
      "  ? run('npm', ['run', 'dev', '--workspace', 'web'])",
      "  : run('npm', ['--prefix', 'frontend', 'run', 'dev']);",
      '',
      'let exiting = false;',
      'function shutdown(code) {',
      '  if (exiting) return;',
      '  exiting = true;',
      "  if (!api.killed) api.kill('SIGINT');",
      "  if (!web.killed) web.kill('SIGINT');",
      '  process.exit(code);',
      '}',
      '',
      "api.on('exit', (code) => shutdown(code || 0));",
      "web.on('exit', (code) => shutdown(code || 0));",
      "process.on('SIGINT', () => shutdown(0));",
      "process.on('SIGTERM', () => shutdown(0));"
    ].join('\n') + '\n'
  );

  const workspaceYaml = ['packages:', ...workspaceGlobs.map((item) => `  - "${item}"`)].join('\n') + '\n';
  writeFileIfNeeded(path.join(root, 'pnpm-workspace.yaml'), workspaceYaml);

  writeFileIfNeeded(
    path.join(root, 'turbo.json'),
    JSON.stringify(
      {
        $schema: 'https://turbo.build/schema.json',
        tasks: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**']
          },
          lint: {},
          test: {
            dependsOn: ['^test']
          },
          dev: {
            cache: false,
            persistent: true
          }
        }
      },
      null,
      2
    ) + '\n'
  );

  writeFileIfNeeded(
    path.join(root, '.editorconfig'),
    'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\nindent_style = space\nindent_size = 2\ninsert_final_newline = true\ntrim_trailing_whitespace = true\n'
  );

  writeFileIfNeeded(
    path.join(root, 'packages', 'shared', 'package.json'),
    JSON.stringify(
      {
        name: '@linkbin/shared',
        private: true,
        version: '0.1.0',
        type: 'module',
        main: './src/index.js'
      },
      null,
      2
    ) + '\n'
  );

  writeFileIfNeeded(
    path.join(root, 'packages', 'shared', 'src', 'index.js'),
    "export const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;\nexport const DEFAULT_URL_TTL_DAYS = 30;\n"
  );

  writeFileIfNeeded(
    path.join(root, 'infra', 'docker', 'docker-compose.dev.yml'),
    [
      'version: "3.9"',
      'services:',
      '  redis:',
      '    image: redis:7-alpine',
      '    container_name: linkbin-redis',
      '    ports:',
      '      - "6379:6379"',
      '    command: ["redis-server", "--appendonly", "yes"]',
      '    volumes:',
      '      - redis-data:/data',
      '',
      'volumes:',
      '  redis-data:'
    ].join('\n') + '\n'
  );

  writeFileIfNeeded(
    path.join(root, '.github', 'workflows', 'ci.yml'),
    [
      'name: CI',
      '',
      'on:',
      '  push:',
      '    branches: ["main", "master"]',
      '  pull_request:',
      '',
      'jobs:',
      '  test-build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          node-version: "22"',
      '      - name: Install',
      '        run: npm install',
      '      - name: Lint',
      '        run: npm run lint --if-present',
      '      - name: Test',
      '        run: npm run test --if-present',
      '      - name: Build',
      '        run: npm run build --if-present'
    ].join('\n') + '\n'
  );

  writeFileIfNeeded(
    path.join(root, 'README.md'),
    [
      '# Linkbin Monorepo',
      '',
      'This repository uses a workspace-first layout for backend and frontend apps.',
      '',
      '## Quick Start',
      '',
      '1. Install dependencies in each app (and root if needed).',
      '2. Run Redis with Docker Compose (optional for local API work).',
      '3. Start apps using root scripts.',
      '',
      '## Bootstrap',
      '',
      'Run `node scripts/bootstrap-monorepo.cjs` to scaffold missing monorepo files.',
      'Use `--migrate-apps` to move `backend` and `frontend` into `apps/api` and `apps/web`.',
      'Use `--dry-run` for a preview and `--force` to overwrite generated files.'
    ].join('\n') + '\n'
  );

  log('Done.');
  log('Tip: run "node scripts/verify-monorepo.cjs" to validate generated structure.');
}

main();
