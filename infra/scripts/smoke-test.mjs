#!/usr/bin/env node
/**
 * Smoke Test — API uç noktalarının ayakta olduğunu doğrular.
 * Kullanım: node infra/scripts/smoke-test.mjs [BASE_URL]
 * Varsayılan: http://localhost:3001
 */

const BASE = process.argv[2] ?? 'http://localhost:3001'
let passed = 0
let failed = 0

async function check(label, fn) {
  try {
    await fn()
    console.log(`  ✔ ${label}`)
    passed++
  } catch (err) {
    console.error(`  ✖ ${label}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

console.log(`\nSmoke test → ${BASE}\n`)

// 1. /health
await check('GET /health → 200 { ok: true }', async () => {
  const res = await fetch(`${BASE}/health`)
  assert(res.status === 200, `Beklenen 200, alınan ${res.status}`)
  const body = await res.json()
  assert(body.ok === true, `ok: true beklendi`)
})

// 2. /ready
await check('GET /ready → 200 (Redis bağlı)', async () => {
  const res = await fetch(`${BASE}/ready`)
  assert(res.status === 200, `Beklenen 200, alınan ${res.status} — Redis çalışıyor mu?`)
})

// 3. POST /api/shorten
let code
await check('POST /api/shorten → 201 + code döner', async () => {
  const res = await fetch(`${BASE}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://github.com', alias: `smoke-${Date.now()}` })
  })
  assert(res.status === 201, `Beklenen 201, alınan ${res.status}`)
  const body = await res.json()
  assert(body.code, 'code alanı eksik')
  assert(body.shortPath, 'shortPath alanı eksik')
  code = body.code
})

// 4. GET /:code → redirect
await check('GET /:code → 302 redirect', async () => {
  assert(code, 'Önceki adım başarısız olduğu için kod yok')
  const res = await fetch(`${BASE}/${code}`, { redirect: 'manual' })
  assert(res.status === 302, `Beklenen 302, alınan ${res.status}`)
  assert(res.headers.get('location') === 'https://github.com', 'Location header yanlış')
})

// 5. GET /api/stats/:code
await check('GET /api/stats/:code → 200 + series', async () => {
  assert(code, 'Önceki adım başarısız olduğu için kod yok')
  const res = await fetch(`${BASE}/api/stats/${code}`)
  assert(res.status === 200, `Beklenen 200, alınan ${res.status}`)
  const body = await res.json()
  assert(body.code === code, 'code alanı eşleşmiyor')
  assert(typeof body.clicks === 'number', 'clicks sayı olmalı')
  assert(body.series && Array.isArray(body.series.labels), 'series.labels dizi olmalı')
})

// 6. GET /notexist → 404
await check('GET /notexist → 404', async () => {
  const res = await fetch(`${BASE}/notexist-smoke`, { redirect: 'manual' })
  assert(res.status === 404, `Beklenen 404, alınan ${res.status}`)
})

// Özet
console.log(`\n${passed + failed} kontrol: ${passed} geçti, ${failed} başarısız\n`)
if (failed > 0) process.exit(1)
