# Linkbin Monorepo Ana Iskelet Planı

**Tarih:** 2026-05-06
**Hedef:** `backend` (Express + Redis) ve `frontend` (React + Tailwind) kod tabanını tek bir monorepo standardına oturtmak.

## 1) Tasarım Hedefleri

- Tek komutla tüm servisleri geliştirme ortamında çalıştırabilmek
- Ortak kodu (types, util, config) yeniden kullanılabilir hale getirmek
- CI/CD, test ve lint süreçlerini tek çatıdan yönetmek
- Docker ve lokal geliştirme akışlarını çakıştırmadan birlikte yaşatmak

---

## 2) Önerilen Monorepo Yapısı

Aşağıdaki yapı, mevcut klasörlerin (`backend`, `frontend`, `docs`) korunup standart bir monorepo katmanıyla genişletilmesini hedefler.

```txt
linkbin/
  apps/
    api/                    # Express backend
    web/                    # React frontend
  packages/
    shared/                 # Ortak util/type/constants
    eslint-config/          # Paylaşılan lint config (opsiyonel)
    tsconfig/               # Paylaşılan tsconfig presetleri (opsiyonel)
  infra/
    docker/
      docker-compose.dev.yml
      docker-compose.prod.yml
    scripts/
      seed-redis.mjs
      smoke-test.mjs
  docs/
    plan/
      url-shortener-architecture.md
      monorepo-skeleton.md
  .github/
    workflows/
      ci.yml
  package.json              # Workspace root
  pnpm-workspace.yaml       # veya npm/yarn workspace config
  turbo.json                # Turborepo tercih edilirse
  .editorconfig
  .gitignore
  README.md
```

> Geçişte mevcut `backend/` -> `apps/api/`, `frontend/` -> `apps/web/` olarak taşınabilir. İstersen kısa vadede mevcut isimler korunur, sadece workspace root eklenir.

---

## 3) Paket Yönetimi Seçimi

## Öneri: `pnpm workspaces`

Neden:
- Disk kullanımında verimli (global store + symlink)
- Monorepo ölçeğinde hızlı install
- Workspace bağımlılıklarını net yönetir

Alternatifler:
- `npm workspaces`: daha az ek araç, ancak büyük monorepoda performans sınırlı olabilir.
- `yarn berry`: güçlü ama öğrenme eşiği ve PnP karmaşıklığı ekleyebilir.

---

## 4) Root Seviyesi Komut Sözleşmesi

Root `package.json` script hedefleri:

- `dev`: frontend + backend paralel çalıştır
- `dev:api`: sadece backend
- `dev:web`: sadece frontend
- `build`: tüm workspace build
- `test`: tüm workspace test
- `lint`: tüm workspace lint
- `format`: tüm workspace format
- `docker:dev`: compose ile servisleri kaldır

Bu sözleşme, onboarding süresini ciddi azaltır.

---

## 5) Uygulama Sınırları (Boundaries)

## `apps/api` (backend)

İç öneri:

```txt
apps/api/
  src/
    app.ts
    server.ts
    routes/
      shorten.route.ts
      redirect.route.ts
      stats.route.ts
    services/
      redis.service.ts
      shortener.service.ts
      stats.service.ts
    lib/
      logger.ts
      env.ts
  test/
  package.json
```

## `apps/web` (frontend)

```txt
apps/web/
  src/
    app/
      router.jsx
      providers.jsx
    pages/
      HomePage.jsx
      StatsPage.jsx
    features/
      shorten/
      stats/
    shared/
      api/client.ts
      ui/
      hooks/
      utils/
  package.json
```

## `packages/shared`

İçerik:
- API response tipleri (`ShortenResponse`, `StatsResponse`)
- alias/url validasyon yardımcıları
- ortak sabitler (ör. alias regex, TTL gün sayısı)

Böylece backend ve frontend aynı sözleşmeyi kullanır.

---

## 6) Konfigürasyon Standardı

- `.env` dosyaları app bazında tutulur:
  - `apps/api/.env`
  - `apps/web/.env`
- Ortak env şeması kod içinde doğrulanır (ör. `zod`)
- Root `.env.example` ile minimum gerekli değişkenler belgelenir

Önerilen backend env'leri:
- `PORT`
- `BASE_URL`
- `REDIS_URL`
- `URL_TTL_SECONDS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

---

## 7) Test Stratejisi

- `apps/api`:
  - unit: service katmanı
  - integration: route + Redis (test container veya mock)
- `apps/web`:
  - component test (form, copy button, stats card)
  - API mapping test (Chart.js labels/data dönüşümü)
- `infra/scripts/smoke-test.mjs`:
  - kısa bir e2e health check (shorten -> redirect -> stats)

---

## 8) Docker ile Monorepo Entegrasyonu

Dev aşaması için sade başlangıç:
- Docker: `redis`
- Lokal: `apps/api`, `apps/web`

İleri aşama:
- `apps/api` ve `apps/web` için çok-aşamalı Dockerfile
- `infra/docker/docker-compose.dev.yml` ile tek komutta tam stack

Bu yaklaşım, hem hızlı yerel geliştirme hem de tutarlı deploy sağlar.

---

## 9) CI/CD İskele Önerisi

`.github/workflows/ci.yml` aşamaları:
1. install
2. lint
3. test
4. build
5. (opsiyonel) docker image build

Monorepo optimizasyonu:
- sadece değişen workspace'leri test/build et
- cache: package manager store + build cache (Turborepo/Nx)

---

## 10) Geçiş Planı (Mevcut Yapıdan Monorepo'ya)

1. Root workspace dosyalarını ekle (`package.json`, workspace config)
2. Mevcut `backend` ve `frontend` klasörlerini workspace olarak tanımla
3. Script sözleşmesini root'a taşı
4. Ortak `packages/shared` oluştur
5. Lint/test/build komutlarını merkezileştir
6. Docker ve CI dosyalarını monorepo yapısına göre güncelle

Not: İstersen fiziksel klasör taşımasını (`backend -> apps/api`) ikinci faza bırakabilirsin.

---

## 11) MVP İçin Minimum Monorepo Kurulum Seti

İlk adımda mutlaka gerekenler:
- root `package.json` (workspace scripts)
- workspace config (`pnpm-workspace.yaml` veya npm eşdeğeri)
- `apps/api` + `apps/web` workspace girişleri
- root `README.md` (tek komutla çalıştırma)

Opsiyonel (ama güçlü):
- `packages/shared`
- `turbo.json`
- merkezi eslint/prettier config

---

## 12) Sonuç ve Karar

Bu iskelet, projeyi:
- kısa vadede daha düzenli,
- orta vadede test edilebilir,
- uzun vadede ekipçe sürdürülebilir
hale getirir.

En dengeli başlangıç: **pnpm workspace + mevcut klasörleri koru + root script standardı**. Sonraki adımda klasörleri `apps/` ve `packages/` altına taşıyarak tam monorepo düzenine geçilir.
