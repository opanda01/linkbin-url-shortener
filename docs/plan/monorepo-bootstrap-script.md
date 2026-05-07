# Monorepo Iskelet Bootstrap Scripti

Bu dokuman, monorepo ana iskeletini otomatik olusturmak icin eklenen scriptlerin kullanimini aciklar.

## Eklenen scriptler

- `scripts/bootstrap-monorepo.cjs`
- `scripts/verify-monorepo.cjs`

## Ne yapar?

`bootstrap-monorepo.cjs` su dosya/klasorleri olusturur (varsa dokunmaz):
- root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.editorconfig`, `README.md`
- ortak paket: `packages/shared/*`
- altyapi: `infra/docker/docker-compose.dev.yml`
- CI iskeleti: `.github/workflows/ci.yml`

Opsiyonel olarak:
- `--migrate-apps` ile `backend -> apps/api` ve `frontend -> apps/web` tasima denemesi yapar.

## Kullanim

```bat
node scripts\bootstrap-monorepo.cjs --dry-run
node scripts\bootstrap-monorepo.cjs
node scripts\bootstrap-monorepo.cjs --migrate-apps
node scripts\verify-monorepo.cjs
```

## Notlar

- Script idempotent tasarlanmistir; mevcut dosyalari varsayilan olarak ezmez.
- Mevcut dosyalari guncellemek istersen `--force` ekleyebilirsin.
- Tasima adimi (`--migrate-apps`) hedef klasor varsa otomatik olarak skip edilir.
