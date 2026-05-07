# Linkbin

URL kısaltma servisi — Node.js API + React web frontend, Redis destekli.

## Geliştirme Ortamı

```bash
# Bağımlılıkları kur
npm install

# Redis'i başlat
cd infra/docker && docker compose -f docker-compose.dev.yml up -d

# API'yi başlat (port 3001)
npm run dev:api

# Web'i başlat (port 5173)
npm run dev:web
```

## Testler

```bash
# Tüm testler
npm test

# Sadece API (11 test)
npm run test:api

# Sadece web (18 test)
npm run test:web

# Smoke test (API ayaktayken)
npm run smoke
```

## Docker

```bash
# API image
docker build -t linkbin-api apps/api

# Web image (VITE_API_URL gerekli)
docker build --build-arg VITE_API_URL=https://yourdomain.com -t linkbin-web apps/web
```

## CI / CD

Her `main`/`master` push'unda GitHub Actions otomatik olarak:

1. **Test** — API (Redis service container ile) + Web testleri + web build kontrolü
2. **Docker Build & Push** — `ghcr.io/<owner>/linkbin-api:latest` ve `ghcr.io/<owner>/linkbin-web:latest`
3. **Deploy** — SSH ile sunucuya bağlan, `docker compose pull && up`

### Gerekli GitHub Secrets

| Secret | Açıklama |
|---|---|
| `DEPLOY_HOST` | Sunucu IP veya hostname |
| `DEPLOY_USER` | SSH kullanıcı adı |
| `DEPLOY_KEY` | SSH private key (ed25519 önerilir) |
| `VITE_API_URL` | Prod API URL'i (ör: `https://api.yourdomain.com`) |

> `GITHUB_TOKEN` otomatik sağlanır, ek ayar gerekmez.

**Deploy'u aktif etmek için** GitHub → Settings → Variables → `DEPLOY_ENABLED = true` ekle.  
Bu variable olmadan test + docker build çalışır, deploy job atlanır.

### Sunucu Kurulumu (ilk kez)

```bash
# Sunucuda
mkdir -p /opt/linkbin
cd /opt/linkbin
git clone <repo> .
cp apps/api/.env.example apps/api/.env.prod
# .env.prod dosyasını düzenle
```

## Ortam Değişkenleri

`apps/api/.env.example` dosyasını kopyala:

```bash
cp apps/api/.env.example apps/api/.env
```

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3001` | API portu |
| `REDIS_URL` | `redis://localhost:6379` | Redis bağlantı URL'i |
| `URL_TTL_SECONDS` | `2592000` | Link ömrü (30 gün) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit penceresi (15 dk) |
| `RATE_LIMIT_MAX` | `60` | Pencere başına max istek |

