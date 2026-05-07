# Linkbin — Geliştirme Yol Haritası

**Son güncelleme:** 2026-05-07  
**Durum:** Aşama 1 tamamlandı — API üretim kalitesinde çalışıyor

---

## Genel İlerleme

| Bileşen | Durum | Notlar |
|---|---|---|
| Monorepo yapısı | ✅ Tamamlandı | npm workspaces, turbo.json, pnpm-workspace.yaml |
| `apps/api` iskeleti | ✅ Tamamlandı | Native HTTP (Express yok), routes/services/lib katmanları |
| `apps/web` iskeleti | ✅ Tamamlandı | React + Vite + Tailwind v4 + React Router v7 |
| `packages/shared` | ✅ Temel mevcut | ALIAS_REGEX, DEFAULT_URL_TTL_DAYS |
| Redis entegrasyonu | ✅ Tamamlandı | Singleton client, atomic SET NX, TTL, fire-and-forget analytics |
| Stats endpoint | ✅ Tamamlandı | `series`, `ttlDays`, `lastClickAt` dahil tam response |
| Rate limiting | ✅ Tamamlandı | Fixed-window, IP bazlı, `429 + Retry-After` |
| `/ready` endpoint | ✅ Tamamlandı | Redis ping, 503 fallback |
| `.env` yönetimi | ✅ Tamamlandı | `.env.example` dosyaları oluşturuldu |
| Stats grafiği (web) | ✅ Tamamlandı | Line chart, günlük seri, boş durum mesajı |
| Hata UX (429/409) | ✅ Tamamlandı | Türkçe hata mesajları, `retryAfterSec` gösterimi |
| Docker stack | ⚠️ Kısmi | Sadece Redis compose dosyası var |
| CI/CD | ⚠️ Temel | ci.yml mevcut ama web build / api test adımları yok |
| Test kapsamı | ⚠️ Kısmi | 11 API testi geçiyor, web testleri henüz yok |

---

## ✅ Aşama 1 — API Üretim Kalitesine Taşıma (TAMAMLANDI)

### 1.1 Redis Entegrasyonu ✅

**Tamamlanma:** 2026-05-07  
**Değişen dosyalar:**
- `apps/api/src/services/redis.service.js` — singleton `getRedisClient()` / `disconnectRedis()`
- `apps/api/src/services/shortener.service.js` — tam Redis implementasyonu

**Uygulanan Redis veri modeli:**
```
url:{code}    → string  — orijinal URL (SET NX EX ile atomik oluşturma)
meta:{code}   → hash    — { url, createdAt }
clicks:{code} → string  — toplam tıklama sayacı (INCR)
stats:{code}  → hash    — { "YYYY-MM-DD": count } günlük istatistik
```

**Teknik kararlar:**
- `SET url:{code} {url} NX EX {ttl}` — `null` dönerse 409, tek komutla atomik
- Tüm 4 anahtar aynı TTL ile oluşturulur (`URL_TTL_SECONDS`, varsayılan 30 gün)
- Redirect sırasında `INCR` + `HINCRBY` fire-and-forget (redirect gecikmesini sıfır tutar)
- `stats:{code}` hash'i her tıklamada `EXPIRE` ile TTL yenilenir
- `server.js`'de `SIGINT/SIGTERM` ile graceful shutdown (Redis bağlantısı temizce kapatılır)

---

### 1.2 Stats Endpoint Genişletme ✅

**Tamamlanma:** 2026-05-07  
**Değişen dosyalar:**
- `apps/api/src/services/shortener.service.js` — `stats()` metodu genişletildi
- `apps/web/src/features/stats/ClicksChart.jsx` — Bar → Line chart
- `apps/web/src/features/stats/StatsCard.jsx` — yeni metrikler eklendi
- `apps/web/src/pages/StatsPage.jsx` — `series` prop geçiliyor
- `apps/web/src/shared/utils/format.js` — YYYY-MM-DD desteği
- `apps/web/src/shared/api/client.js` — varsayılan port 3001 olarak düzeltildi

**Backend response formatı (`GET /api/stats/:code`):**
```json
{
  "code": "abc123",
  "url": "https://example.com",
  "createdAt": "2026-05-07T13:00:00.000Z",
  "clicks": 42,
  "ttlDays": 29,
  "lastClickAt": "2026-05-07",
  "series": {
    "labels": ["2026-05-05", "2026-05-06", "2026-05-07"],
    "data": [10, 15, 17]
  }
}
```

**Frontend değişiklikleri:**
- `ClicksChart` → `react-chartjs-2` Line chart, area fill, `tension: 0.3`
- Sıfır tıklama → "Henüz tıklama verisi yok" boş durum mesajı
- `StatsCard` → `ttlDays` (son kullanma) + `lastClickAt` (son tıklama) metrikleri eklendi

---

### 1.3 Native HTTP Rate Limiter ✅

**Tamamlanma:** 2026-05-07  
**Yeni dosya:** `apps/api/src/lib/rate-limit.js`  
**Değişen dosyalar:**
- `apps/api/src/app.js` — rate limiter entegre edildi
- `apps/api/src/lib/env.js` — `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` eklendi
- `apps/web/src/features/shorten/useShorten.js` — 429/409 özel hata mesajları

**Tasarım:**
- `createRateLimiter({ windowMs, max })` factory fonksiyonu
- Fixed-window algoritması, IP başına `Map<ip, { count, resetAt }>`
- `setInterval` ile süresi dolmuş kayıt temizleme (`.unref()` ile event loop'u tutmaz)
- `check(ip)` → `{ allowed: boolean, retryAfterSec: number }`
- `reset(ip)` — test ve admin amaçlı

**HTTP davranışı:**
- Limit aşılınca: `429 Too Many Requests` + `Retry-After: N` header
- Response body: `{ "error": "Too many requests", "retryAfterSec": N }`
- Yalnızca `POST /api/shorten` rotasına uygulanır (redirect ve stats serbest)

**Varsayılan değerler (`.env` ile geçersiz kılınabilir):**
```
RATE_LIMIT_WINDOW_MS=900000   # 15 dakika
RATE_LIMIT_MAX=60             # 15 dakikada 60 istek
```

**Testler:** `test/rate-limit.test.js` — 5 unit test (window sıfırlama, limit aşımı, IP izolasyonu, reset, TTL)

---

### 1.4 `/ready` Endpoint ✅

**Tamamlanma:** 2026-05-07  
**Değişen dosya:** `apps/api/src/app.js`

- `GET /health` → `200 { ok: true }` — process ayakta
- `GET /ready` → Redis `ping()`, başarılı: `200 { ok: true }`, başarısız: `503 { error: "redis unavailable" }`

---

### 1.5 `.env` Yönetimi ✅

**Tamamlanma:** 2026-05-07  
**Yeni dosyalar:**
- `apps/api/.env.example`
- `apps/web/.env.example`

**`apps/api/.env.example`:**
```
PORT=3001
BASE_URL=http://localhost:3001
REDIS_URL=redis://localhost:6379
URL_TTL_SECONDS=2592000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=60
```

**`apps/web/.env.example`:**
```
VITE_API_URL=http://localhost:3001
```

---

## 🔄 Aşama 2 — Frontend Tamamlama (KISMI)

### 2.1 API Sözleşme Uyumu ⚠️ Kısmi

- `client.js` → varsayılan URL `http://localhost:3001` ✅
- `ShortenResult.jsx` → `shortUrl` için `window.location.origin` kullanıyor; API ve web farklı domain'deyse `VITE_API_URL` base'e geçilmeli ❌

### 2.2 Stats Sayfası Günlük Grafik ✅

Tamamlandı (bkz. 1.2).

### 2.3 Hata Durumu İyileştirme ⚠️ Kısmi

- `429` → Türkçe mesaj + dakika gösterimi ✅
- `409` → "Bu kısa kod zaten kullanımda" mesajı ✅
- Network hatası fallback → genel "Beklenmeyen bir hata oluştu" mesajı var, özel fallback yok ❌

### 2.4 `VITE_API_URL` Fallback ✅

`client.js` → `import.meta.env.VITE_API_URL || 'http://localhost:3001'`

---

## ⏳ Aşama 3 — `packages/shared` Genişletme (BEKLIYOR)

**Dosya:** `packages/shared/src/index.js`

Şu an sadece 2 sabit var. Eklenecekler:
- `validateUrl(url)` — URL doğrulama (hem API hem web kullanabilir)
- `validateAlias(alias)` — alias format kontrolü
- `formatShortUrl(baseUrl, code)` — kısa URL oluşturma yardımcısı
- `ShortenRequest` / `ShortenResponse` JSDoc tipleri (TypeScript'e geçişe hazır)

Böylece aynı validasyon mantığı API ve web'de tekrar edilmez.

---

## ⏳ Aşama 4 — Test Kapsamı (KISMI)

### 4.1 API Testleri ⚠️ Kısmi

**Mevcut (11 test, tümü geçiyor):**
- `test/app.test.js` — 6 entegrasyon testi (shorten, resolve, /health, /ready, 409, 429, 404)
- `test/rate-limit.test.js` — 5 unit test

**Eksik:**
- `shortener.service.test.js` — Redis mock ile unit testler
- `routes.integration.test.js` — tüm rota kombinasyonları

### 4.2 Web Testleri ❌

Vitest + @testing-library/react henüz kurulmadı:
- `ShortenForm.test.jsx`
- `ShortenResult.test.jsx`
- `StatsCard.test.jsx`

### 4.3 Smoke Test ❌

**Dosya:** `infra/scripts/smoke-test.mjs`
- `/health`, `POST /api/shorten`, `GET /:code`, `GET /api/stats/:code`

---

## ⏳ Aşama 5 — Docker ve Altyapı (KISMI)

### 5.1 API Dockerfile ❌

**Yeni dosya:** `apps/api/Dockerfile`

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app .
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
```

### 5.2 Web Dockerfile ❌

- Çok aşamalı: build (Vite) + serve (nginx)
- `VITE_API_URL` build arg olarak alınmalı

### 5.3 `docker-compose.dev.yml` Güncelleme ❌

Şu an sadece Redis var. API servisi eklenecek:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["127.0.0.1:6379:6379"]
  api:
    build: ../../apps/api
    ports: ["3001:3001"]
    env_file: ../../apps/api/.env
    depends_on: [redis]
```

### 5.4 `docker-compose.prod.yml` ❌

- api + web + redis + reverse proxy (nginx veya Caddy)
- SSL termination

---

## ⏳ Aşama 6 — CI/CD İyileştirme (BEKLIYOR)

**Dosya:** `.github/workflows/ci.yml`

Şu an sadece `npm install / lint / test / build` var. Eklenecekler:
- Node 22 matrix
- Workspace bazlı cache (`**/package-lock.json` hash)
- Web build adımı (`npm run build --workspace web`)
- API test adımı (`npm run test --workspace api`)
- (opsiyonel) Docker image build kontrolü

---

## Öncelik Sırası (Güncel)

```
✅ 1. Redis entegrasyonu          (Aşama 1.1 + 1.2)
✅ 2. Rate limiter                (Aşama 1.3)
✅ 3. .env dosyaları              (Aşama 1.5)
✅ 4. Frontend stats grafiği      (Aşama 2.2)
✅ 5. Hata UX 429/409             (Aşama 2.3 kısmı)
⏳ 6. packages/shared genişleme   (Aşama 3)
⏳ 7. ShortenResult URL düzeltme  (Aşama 2.1 kalan)
⏳ 8. Test kapsamı genişletme     (Aşama 4)
⏳ 9. Docker tamamlama            (Aşama 5)
⏳ 10. CI iyileştirme             (Aşama 6)
```

---

## Teknik Borç ve Notlar

- **Rate limiter in-memory** — yatay scale durumunda Redis tabanlıya (`INCR` + `EXPIRE`) yükseltilmeli
- **`ShortenResult.jsx`** — `shortUrl` için `window.location.origin` kullanıyor; API ayrı domain'deyse `VITE_API_URL` base'e geçilmeli
- **`stats.service.js`** (`createStatsSnapshot`) — artık hiçbir yerden import edilmiyor, silinebilir
- **`packages/shared`** — API veya web tarafından henüz import edilmiyor; Aşama 3'te bağlanacak
- **`apps/api/package.json` `"type": "commonjs"`** — ilerleyen aşamada ESM veya TypeScript'e geçiş değerlendirilebilir
- **Docker port binding** — `docker-compose.dev.yml`'de Redis portu `127.0.0.1:6379:6379` olarak kısıtlandı (dışa kapalı)

