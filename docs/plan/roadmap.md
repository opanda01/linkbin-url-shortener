# Linkbin — Geliştirme Yol Haritası

**Son güncelleme:** 2026-05-07  
**Durum:** Aşama 1–5 tamamlandı — CI/CD pipeline aktif, Docker image'lar GitHub Actions ile otomatik build ediliyor

---

## Genel İlerleme

| Bileşen | Durum | Notlar |
|---|---|---|
| Monorepo yapısı | Tamamlandı | npm workspaces, turbo.json |
| `apps/api` iskeleti | Tamamlandı | Native HTTP (Express yok), routes/services/lib katmanları |
| `apps/web` iskeleti | Tamamlandı | React + Vite + Tailwind v4 + React Router v7 |
| `packages/shared` | Temel mevcut | ALIAS_REGEX, DEFAULT_URL_TTL_DAYS sabitleri |
| Redis entegrasyonu | Tamamlandı | Singleton client, atomic SET NX, TTL, graceful shutdown |
| Stats endpoint | Tamamlandı | `series`, `ttlDays`, `lastClickAt` dahil tam response |
| Rate limiting | Tamamlandı | Fixed-window, IP bazlı, `429 + Retry-After` |
| `/health` + `/ready` | Tamamlandı | Redis ping, 503 fallback |
| `.env` yönetimi | Tamamlandı | `.env.example` dosyaları, `dotenvx` entegrasyonu |
| Stats grafiği (web) | Tamamlandı | Line chart, günlük seri, boş durum mesajı |
| Hata UX (429/409) | Tamamlandı | Türkçe hata mesajları, `retryAfterSec` gösterimi |
| Redis hata döngüsü fix | Tamamlandı | Max 5 retry, exponential backoff, tek log |
| API unit testleri | Tamamlandı | 25 test — app, rate-limit, shortener service |
| Web component testleri | Tamamlandı | 18 test — ShortenForm, ShortenResult, StatsCard |
| Smoke test | Tamamlandı | `infra/scripts/smoke-test.mjs` — 6 canlı API kontrolü |
| API Dockerfile | Tamamlandı | Multi-stage, Node 22 alpine, production-ready |
| Web Dockerfile | Tamamlandı | Vite build + nginx alpine, SPA fallback, gzip |
| `docker-compose.prod.yml` | Tamamlandı | api + web + redis + caddy reverse proxy |
| `.dockerignore` | Tamamlandı | API ve web için ayrı ayrı |
| `.gitignore` | Tamamlandı | Root seviyesinde, `.env` koruması dahil |
| CI/CD pipeline | Tamamlandı | 3 job: test → docker build+push → SSH deploy |
| README | Tamamlandı | Kurumsal İngilizce, mimari açıklaması dahil |
| `infra/caddy/Caddyfile` | Bekliyor | `infra/caddy/` dizini oluşturulunca eklenecek |

---

## Tamamlanan Aşamalar

### Aşama 1 — API Üretim Kalitesine Taşıma

**Redis veri modeli:**
```
url:{code}    → string  — orijinal URL (SET NX EX)
meta:{code}   → hash    — { url, createdAt }
clicks:{code} → string  — toplam tıklama sayacı
stats:{code}  → hash    — { "YYYY-MM-DD": count }
```

- `SET NX` ile atomik alias çakışma kontrolü (409)
- Redirect sırasında fire-and-forget analytics (gecikme sıfır)
- Fixed-window rate limiter — `createRateLimiter({ windowMs, max })`
- `GET /health` + `GET /ready` — Docker healthcheck uyumlu
- Graceful shutdown: `SIGINT/SIGTERM` → Redis bağlantısı temizce kapatılır
- Redis bağlantı hatası düzeltmesi: max 5 retry, exponential backoff, log flood önleme

---

### Aşama 2 — Frontend Tamamlama

- Stats sayfası Line chart (günlük seri, area fill)
- `ttlDays` (son kullanma) + `lastClickAt` (son tıklama) metrikleri
- 429/409 Türkçe hata mesajları, `retryAfterSec` gösterimi
- `VITE_API_URL` environment variable desteği
- `format.js` — Redis'ten gelen `YYYY-MM-DD` string'lerini doğru parse etme

---

### Aşama 4 — Test Kapsamı

**API testleri (25 test, tümü geçiyor):**
- `test/app.test.js` — 6 entegrasyon testi (HTTP katmanı, mock service)
- `test/rate-limit.test.js` — 5 unit test (window, limit, IP izolasyonu, reset, TTL)
- `test/shortener.service.test.js` — 14 unit test (Redis tam mock, tüm servis metodları)

**Web testleri (18 test, tümü geçiyor):**
- `ShortenForm.test.jsx` — 6 test (render, submit, validation, loading state)
- `ShortenResult.test.jsx` — 5 test (link render, copy, reset)
- `StatsCard.test.jsx` — 7 test (metrik render, null state, conditional display)

**Smoke test:**
- `infra/scripts/smoke-test.mjs` — canlı API'ye karşı 6 uçtan uca kontrol
- `npm run smoke [BASE_URL]` ile çalıştırılır

---

### Aşama 5 — Docker ve Altyapı

| Dosya | Açıklama |
|---|---|
| `apps/api/Dockerfile` | Multi-stage Node 22 alpine, `--omit=dev` |
| `apps/api/.dockerignore` | node_modules, .env, test dosyaları hariç |
| `apps/web/Dockerfile` | Vite build + nginx alpine, `VITE_API_URL` build-arg |
| `apps/web/nginx.conf` | SPA fallback (`try_files`), gzip, asset cache headers |
| `apps/web/.dockerignore` | node_modules, dist, test dosyaları hariç |
| `infra/docker/docker-compose.dev.yml` | Redis (local geliştirme) |
| `infra/docker/docker-compose.prod.yml` | Redis + API + Web + Caddy reverse proxy |

---

### Aşama 6 — CI/CD Pipeline

**Dosya:** `.github/workflows/ci.yml`

**Job 1: Test** (her push + PR)
- Redis service container (health check ile)
- `npm install` → `lint` → API testleri → Web testleri → Web build kontrolü
- Tüm env değişkenleri workflow içinde set edilir (`.env` dosyası gerektirmez)

**Job 2: Docker Build & Push** (sadece `main`/`master` push, test geçince)
- `docker/login-action` → ghcr.io (`GITHUB_TOKEN` otomatik)
- `docker/build-push-action` → `latest` + `sha-xxx` tag
- GHA layer cache (`cache-from/to: type=gha`)
- Image isimleri: `ghcr.io/{owner}/linkbin-api`, `ghcr.io/{owner}/linkbin-web`

**Job 3: Deploy** (sadece `DEPLOY_ENABLED=true` variable'ı olunca)
- `appleboy/ssh-action` → sunucuya SSH
- `docker compose pull && up -d --remove-orphans`
- `docker image prune -f`

---

## Devam Eden / Bekleyen İşler

### Aşama 3 — `packages/shared` Genişletme

`packages/shared/src/index.js` şu an sadece 2 sabit içeriyor. Eklenebilecekler:

- `validateUrl(url)` — URL doğrulama (API ve web'de aynı mantık)
- `validateAlias(alias)` — alias format kontrolü (3–32 karakter, `[a-zA-Z0-9_-]`)
- `formatShortUrl(baseUrl, code)` — kısa URL oluşturma yardımcısı

### Infra

- `infra/caddy/Caddyfile` — Caddy reverse proxy config (dizin oluşturulunca eklenecek)
  - Routing: `/{code}` → API, `/api/*` → API, diğerleri → web SPA

### Geliştirme Ortamı İyileştirmeleri

- `docker-compose.dev.yml`'e API servisi eklenmesi (şu an sadece Redis)
- `ShortenResult.jsx`'te `window.location.origin` yerine `VITE_API_URL` kullanımı (farklı domain'de deploy için)

### Olası Sonraki Özellikler

- QR kod oluşturma (kısa URL başına)
- Kullanıcı hesabı / link sahipliği
- Özel domain desteği
- Link düzenleme / erken silme
- Tıklama kaynağı analizi (Referer header)

---

## GitHub Secrets / Variables Durumu

| Değer | Tür | Durum |
|---|---|---|
| `GITHUB_TOKEN` | Otomatik | Hazır (Actions tarafından sağlanır) |
| `VITE_API_URL` | Secret | Ayarlanması gerekiyor |
| `DEPLOY_HOST` | Secret | Ayarlanması gerekiyor |
| `DEPLOY_USER` | Secret | Ayarlanması gerekiyor |
| `DEPLOY_KEY` | Secret | Ayarlanması gerekiyor |
| `DEPLOY_ENABLED` | Variable | `true` yapılınca deploy job aktif olur |



---

## Teknik Borç ve Notlar

- **Rate limiter in-memory** — yatay scale durumunda Redis tabanlıya (`INCR` + `EXPIRE`) yükseltilmeli
- **`ShortenResult.jsx`** — `shortUrl` için `window.location.origin` kullanıyor; API ayrı domain'deyse `VITE_API_URL` base'e geçilmeli
- **`stats.service.js`** (`createStatsSnapshot`) — artık hiçbir yerden import edilmiyor, silinebilir
- **`packages/shared`** — API veya web tarafından henüz import edilmiyor; Aşama 3'te bağlanacak
- **`apps/api/package.json` `"type": "commonjs"`** — ilerleyen aşamada ESM veya TypeScript'e geçiş değerlendirilebilir
- **Docker port binding** — `docker-compose.dev.yml`'de Redis portu `127.0.0.1:6379:6379` olarak kısıtlandı (dışa kapalı)

