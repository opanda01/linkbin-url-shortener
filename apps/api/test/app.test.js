const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createApp } = require('../src/app');

// Redis gerektirmeyen in-memory mock service
function createMockShortenerService() {
  const store = new Map();

  return {
    async shorten({ url, alias }) {
      if (!url) return { ok: false, statusCode: 400, message: 'url is required' };
      const code = alias || 'mock01';
      if (store.has(code)) return { ok: false, statusCode: 409, message: 'alias is already in use' };
      const createdAt = new Date().toISOString();
      store.set(code, { code, url, clicks: 0, createdAt });
      return { ok: true, data: { code, url, shortPath: `/${code}`, createdAt } };
    },
    async resolve(code) {
      const r = store.get(code);
      if (!r) return { ok: false, statusCode: 404, message: 'link not found' };
      r.clicks += 1;
      return { ok: true, data: { url: r.url } };
    },
    async stats(code) {
      const r = store.get(code);
      if (!r) return { ok: false, statusCode: 404, message: 'link not found' };
      return { ok: true, data: { code: r.code, url: r.url, clicks: r.clicks, createdAt: r.createdAt, series: { labels: [], data: [] } } };
    },
    async ping() { return true; }
  };
}

test('shortens and resolves a URL through the native HTTP app', async () => {
  const server = http.createServer(createApp({ shortenerService: createMockShortenerService() }));

  await listen(server);

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const createResponse = await fetch(`${baseUrl}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://github.com', alias: 'github' }),
      redirect: 'manual'
    });

    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.code, 'github');

    const redirectResponse = await fetch(`${baseUrl}/github`, { redirect: 'manual' });
    assert.equal(redirectResponse.status, 302);
    assert.equal(redirectResponse.headers.get('location'), 'https://github.com');
  } finally {
    await close(server);
  }
});

test('/health returns 200', async () => {
  const server = http.createServer(createApp({ shortenerService: createMockShortenerService() }));
  await listen(server);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  } finally {
    await close(server);
  }
});

test('/ returns API metadata instead of Route not found', async () => {
  const server = http.createServer(createApp({ shortenerService: createMockShortenerService() }));
  await listen(server);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'linkbin-api');
  } finally {
    await close(server);
  }
});

test('/ready returns 200 when service is healthy', async () => {
  const server = http.createServer(createApp({ shortenerService: createMockShortenerService() }));
  await listen(server);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/ready`);
    assert.equal(res.status, 200);
  } finally {
    await close(server);
  }
});

test('409 when alias already in use', async () => {
  const server = http.createServer(createApp({ shortenerService: createMockShortenerService() }));
  await listen(server);
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', alias: 'dup' })
    };
    await fetch(`${baseUrl}/api/shorten`, opts);
    const second = await fetch(`${baseUrl}/api/shorten`, opts);
    assert.equal(second.status, 409);
  } finally {
    await close(server);
  }
});

test('429 when rate limit exceeded', async () => {
  // max: 1 yaparak ikinci istekte 429 bekle
  const rateLimiter = { check: (() => {
    let calls = 0;
    return () => {
      calls += 1;
      if (calls > 1) return { allowed: false, retryAfterSec: 60 };
      return { allowed: true, retryAfterSec: 0 };
    };
  })() };

  const server = http.createServer(createApp({
    shortenerService: createMockShortenerService(),
    rateLimiter
  }));
  await listen(server);
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    };
    await fetch(`${baseUrl}/api/shorten`, opts);           // 1. istek — geçer
    const second = await fetch(`${baseUrl}/api/shorten`, opts); // 2. istek — 429
    assert.equal(second.status, 429);
    assert.ok(second.headers.get('retry-after'), 'Retry-After header eksik');
    const body = await second.json();
    assert.ok(body.retryAfterSec > 0);
  } finally {
    await close(server);
  }
});

test('404 for unknown short code', async () => {
  const server = http.createServer(createApp({ shortenerService: createMockShortenerService() }));
  await listen(server);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/notexist`, { redirect: 'manual' });
    assert.equal(res.status, 404);
  } finally {
    await close(server);
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

