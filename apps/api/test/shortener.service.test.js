const { mock, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Paylaşılan fake Redis state — her testte sıfırlanır
let fakeRedis;

// redis.service modülünü service require etmeden ÖNCE mock'la
mock.module(require.resolve('../src/services/redis.service'), {
  namedExports: {
    getRedisClient: () => Promise.resolve(fakeRedis)
  }
});

// Mock sonrası require — cached mock üzerinden çalışır
const { createShortenerService } = require('../src/services/shortener.service');

// ─── Fake Redis factory ───────────────────────────────────────────────────────

function makeFakeRedis(overrides = {}) {
  const kv = new Map();     // string key → string value
  const hashes = new Map(); // hash key → { field: value }

  return {
    set: async (key, value, opts = {}) => {
      if (opts.NX && kv.has(key)) return null;
      kv.set(key, String(value));
      return 'OK';
    },
    get: async (key) => kv.get(key) ?? null,
    hSet: async (key, fields) => {
      hashes.set(key, { ...(hashes.get(key) ?? {}), ...fields });
      return Object.keys(fields).length;
    },
    hGetAll: async (key) => hashes.get(key) ?? {},
    expire: async () => 1,
    incr: async (key) => {
      const next = Number(kv.get(key) ?? 0) + 1;
      kv.set(key, String(next));
      return next;
    },
    hIncrBy: async (key, field, by) => {
      const h = hashes.get(key) ?? {};
      const next = Number(h[field] ?? 0) + by;
      hashes.set(key, { ...h, [field]: next });
      return next;
    },
    ttl: async () => 86400 * 29,
    ping: async () => 'PONG',
    ...overrides
  };
}

beforeEach(() => {
  fakeRedis = makeFakeRedis();
});

// ─── shorten() ───────────────────────────────────────────────────────────────

test('shorten: url eksikse 400 döner', async () => {
  const svc = createShortenerService();
  const r = await svc.shorten({});
  assert.equal(r.ok, false);
  assert.equal(r.statusCode, 400);
  assert.match(r.message, /url is required/);
});

test('shorten: geçersiz URL formatı 400 döner', async () => {
  const svc = createShortenerService();
  const r = await svc.shorten({ url: 'not-a-url' });
  assert.equal(r.ok, false);
  assert.equal(r.statusCode, 400);
  assert.match(r.message, /valid http/);
});

test('shorten: ftp:// URL reddedilir', async () => {
  const svc = createShortenerService();
  const r = await svc.shorten({ url: 'ftp://example.com' });
  assert.equal(r.ok, false);
  assert.equal(r.statusCode, 400);
});

test('shorten: geçerli URL başarıyla kısaltılır', async () => {
  const svc = createShortenerService();
  const r = await svc.shorten({ url: 'https://github.com' });
  assert.equal(r.ok, true);
  assert.ok(r.data.code);
  assert.equal(r.data.url, 'https://github.com');
  assert.ok(r.data.shortPath.startsWith('/'));
  assert.ok(r.data.createdAt);
});

test('shorten: özel alias kullanılır', async () => {
  const svc = createShortenerService();
  const r = await svc.shorten({ url: 'https://example.com', alias: 'my-link' });
  assert.equal(r.ok, true);
  assert.equal(r.data.code, 'my-link');
});

test('shorten: alias dolu ise 409 döner', async () => {
  const svc = createShortenerService();
  await svc.shorten({ url: 'https://a.com', alias: 'taken' });
  const r = await svc.shorten({ url: 'https://b.com', alias: 'taken' });
  assert.equal(r.ok, false);
  assert.equal(r.statusCode, 409);
});

test('shorten: 3 karakterden kısa alias yok sayılır, random code üretilir', async () => {
  const svc = createShortenerService();
  const r = await svc.shorten({ url: 'https://x.com', alias: 'ab' });
  assert.equal(r.ok, true);
  // 'ab' geçersiz → random 8-char base64url kodu üretilmeli
  assert.notEqual(r.data.code, 'ab');
});

// ─── resolve() ───────────────────────────────────────────────────────────────

test('resolve: bilinmeyen kod 404 döner', async () => {
  const svc = createShortenerService();
  const r = await svc.resolve('notexist');
  assert.equal(r.ok, false);
  assert.equal(r.statusCode, 404);
});

test('resolve: bilinen kod URL döner', async () => {
  const svc = createShortenerService();
  await svc.shorten({ url: 'https://resolve-test.com', alias: 'res1' });
  const r = await svc.resolve('res1');
  assert.equal(r.ok, true);
  assert.equal(r.data.url, 'https://resolve-test.com');
});

// ─── stats() ─────────────────────────────────────────────────────────────────

test('stats: bilinmeyen kod 404 döner', async () => {
  const svc = createShortenerService();
  const r = await svc.stats('ghost');
  assert.equal(r.ok, false);
  assert.equal(r.statusCode, 404);
});

test('stats: sıfır tıklamayla boş seri döner', async () => {
  const svc = createShortenerService();
  await svc.shorten({ url: 'https://stats-test.com', alias: 'stat1' });
  const r = await svc.stats('stat1');
  assert.equal(r.ok, true);
  assert.equal(r.data.clicks, 0);
  assert.deepEqual(r.data.series, { labels: [], data: [] });
  assert.equal(r.data.lastClickAt, null);
});

test('stats: code, url, createdAt, ttlDays alanları mevcut', async () => {
  const svc = createShortenerService();
  await svc.shorten({ url: 'https://meta-test.com', alias: 'meta1' });
  const r = await svc.stats('meta1');
  assert.equal(r.ok, true);
  assert.equal(r.data.code, 'meta1');
  assert.equal(r.data.url, 'https://meta-test.com');
  assert.ok(r.data.createdAt);
  assert.ok(r.data.ttlDays > 0);
});

// ─── ping() ──────────────────────────────────────────────────────────────────

test('ping: Redis PONG verince true döner', async () => {
  const svc = createShortenerService();
  const alive = await svc.ping();
  assert.equal(alive, true);
});

test('ping: Redis hata verince false döner', async () => {
  fakeRedis = makeFakeRedis({
    ping: async () => { throw new Error('connection refused'); }
  });
  const svc = createShortenerService();
  const alive = await svc.ping().catch(() => false);
  assert.equal(alive, false);
});
