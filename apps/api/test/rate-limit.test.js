const assert = require('node:assert/strict');
const test = require('node:test');
const { createRateLimiter } = require('../src/lib/rate-limit');

test('ilk max istek izin verilir', () => {
  const rl = createRateLimiter({ windowMs: 10_000, max: 3 });
  assert.ok(rl.check('1.2.3.4').allowed);
  assert.ok(rl.check('1.2.3.4').allowed);
  assert.ok(rl.check('1.2.3.4').allowed);
});

test('max+1. istekte reddedilir ve retryAfterSec > 0 döner', () => {
  const rl = createRateLimiter({ windowMs: 10_000, max: 2 });
  rl.check('10.0.0.1');
  rl.check('10.0.0.1');
  const result = rl.check('10.0.0.1');
  assert.equal(result.allowed, false);
  assert.ok(result.retryAfterSec > 0);
});

test('farklı IP adresleri bağımsız pencere tutar', () => {
  const rl = createRateLimiter({ windowMs: 10_000, max: 1 });
  rl.check('192.168.1.1');
  const blocked = rl.check('192.168.1.1');
  const other = rl.check('192.168.1.2');
  assert.equal(blocked.allowed, false);
  assert.equal(other.allowed, true);
});

test('reset sonrası aynı IP tekrar izin alır', () => {
  const rl = createRateLimiter({ windowMs: 10_000, max: 1 });
  rl.check('5.5.5.5');
  assert.equal(rl.check('5.5.5.5').allowed, false);
  rl.reset('5.5.5.5');
  assert.equal(rl.check('5.5.5.5').allowed, true);
});

test('pencere süresi geçince sayaç sıfırlanır', async () => {
  const rl = createRateLimiter({ windowMs: 50, max: 1 });
  rl.check('9.9.9.9');
  assert.equal(rl.check('9.9.9.9').allowed, false);
  await sleep(60);
  assert.equal(rl.check('9.9.9.9').allowed, true);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
