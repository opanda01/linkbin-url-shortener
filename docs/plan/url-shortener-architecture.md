# URL Kısaltıcı Sistemi: Mimari Araştırma ve Teknik Plan

**Tarih:** 2026-05-06
**Kapsam:** Express + Redis backend, React + Tailwind + Chart.js frontend

## 1) Hedef ve Kapsam

Bu belge, planladığın URL kısaltma sisteminin:
- üretim ortamına uygun **mantıksal akışını**,
- Redis üzerinde **veri modelini**,
- performans/güvenlik/operasyon tarafında **tasarım kararlarını**,
- frontend ile backend arasındaki **sözleşmeleri (API contracts)**
netleştirir.

Amaç: hızlı MVP çıkarırken, teknik borcu kontrollü tutmak ve ölçeklenmeye hazır bir temel kurmak.

---

## 2) Fonksiyonel Gereksinimler (Özet)

1. **URL kısaltma** (`POST /api/shorten`)
   - `originalUrl` zorunlu
   - `customAlias` opsiyonel
   - çakışma kontrolü
   - Redis'e map yazımı
2. **Yönlendirme** (`GET /:alias`)
   - alias -> original URL çözümleme
   - 404 fallback
   - redirect + click/stat artışı
3. **İstatistik** (`GET /api/stats/:alias`)
   - toplam tıklanma + günlük kırılım
   - Chart.js uyumlu JSON

Opsiyonel ama önerilen:
- Rate limiting (`/api/shorten`)
- TTL (30 gün)

---

## 3) Yüksek Seviye Mimari

- **Frontend (React SPA)**
  - Form üzerinden kısaltma
  - İstatistik panelinde skor kartı + çizgi grafik
- **Backend (Express API + redirect route)**
  - URL doğrulama, alias üretimi, çakışma yönetimi
  - Redirect + analytics güncelleme
- **Redis (primary datastore)**
  - URL map + sayaç + günlük hash verileri

### Basit istek akışı

1) Kullanıcı URL gönderir -> Backend doğrular -> Redis'e yazar -> kısa link döner.
2) Kullanıcı kısa linke gider -> Backend Redis'ten çözer -> redirect eder -> tıklama istatistiği artırılır.
3) Frontend stats sayfası -> Backend stats endpoint -> Redis'ten veriler -> Chart.js formatında döner.

---

## 4) Redis Veri Modeli (Önerilen)

Minimum model (senin planınla uyumlu):
- `url:{alias}` -> `originalUrl` (string)
- `clicks:{alias}` -> `totalClicks` (integer string)
- `stats:{alias}` -> hash (`YYYY-MM-DD` -> dailyCount)

### Neden bu model?

- `GET url:{alias}` redirect için O(1)
- `INCR clicks:{alias}` atomik, hızlı
- `HINCRBY stats:{alias} {date} 1` ile günlük kırılım kolay
- Chart.js'e dönüşüm basit

### TTL stratejisi (30 gün)

Önemli: TTL sadece `url:{alias}` anahtarına verilirse, `clicks:{alias}` ve `stats:{alias}` yetim (orphan) kalabilir.

Bu yüzden iki yaklaşım var:

1. **Senkron TTL (önerilen MVP+)**
   - `url:{alias}`, `clicks:{alias}`, `stats:{alias}` üçüne de aynı TTL uygula.
   - Oluşturma anında `EXPIRE` ver.
   - Her redirect'te TTL yenilemek isteğe bağlı (sliding expiration). MVP için genelde yenileme yapılmaz.

2. **Sadece URL key TTL**
   - Uygulaması daha basit.
   - Yetim analitik anahtarları için periyodik cleanup job gerekir.

Üretimde operasyonel sadeleşme için **1. yaklaşım** daha güvenli.

---

## 5) Endpoint Tasarımları ve Karar Noktaları

## 5.1 `POST /api/shorten`

### Beklenen istek

```json
{
  "originalUrl": "https://example.com/long/path",
  "customAlias": "kampanya2026"
}
```

### Akış

1. Body parse et (`originalUrl`, `customAlias`).
2. `originalUrl` doğrula:
   - Geçerli URL mi?
   - `http`/`https` dışı protokolleri reddet.
3. `customAlias` varsa:
   - format doğrula (`[a-zA-Z0-9_-]`, uzunluk sınırı)
   - `EXISTS url:{customAlias}` kontrol et
   - varsa `409 Conflict`
4. `customAlias` yoksa:
   - `nanoid` ile alias üret
   - çakışma olursa yeniden üret (retry loop, örn. max 5 deneme)
5. `SET url:{alias} {originalUrl}`
6. TTL açık ise ilgili key'lere `EXPIRE 2592000` (30 gün)
7. Kısa link oluşturup dön.

### Başarılı yanıt (öneri)

```json
{
  "alias": "kampanya2026",
  "shortUrl": "https://short.domain/kampanya2026",
  "originalUrl": "https://example.com/long/path",
  "expiresInDays": 30
}
```

### Hata kodları

- `400`: body/URL/alias validasyon hatası
- `409`: custom alias dolu
- `429`: rate limit
- `500`: Redis veya beklenmeyen hata

### Rate limiting önerisi

Sadece `/api/shorten` için:
- pencere: `15 dakika`
- limit: `IP başına 30-60 istek`
- response: JSON + retry bilgisi

Bu, Redis şişmesini ve bot abuse'u ciddi azaltır.

---

## 5.2 `GET /:alias`

### Akış

1. Param alias al.
2. `GET url:{alias}`
3. yoksa `404`
4. varsa redirect (`302` default veya `301` opsiyonel)
5. redirect'i geciktirmeden analytics güncelle:
   - `INCR clicks:{alias}`
   - `HINCRBY stats:{alias} {YYYY-MM-DD} 1`

### Redirect sonrası analytics nasıl işlenmeli?

Üç seçenek:

1. **Fire-and-forget (MVP)**
   - Redirect response hemen dönülür.
   - Analytics komutları await edilmeden gönderilir.
   - Artı: düşük latency
   - Eksi: süreç kapanırsa bazı click'ler kaybolabilir.

2. **Kısa await + pipeline**
   - `MULTI/EXEC` veya pipeline ile 2 komutu birlikte çalıştır.
   - Artı: daha tutarlı sayaç
   - Eksi: redirect latency biraz artar.

3. **Queue tabanlı async (ileri seviye)**
   - Event queue'ya tıklama bırakılır, worker Redis'e yazar.
   - Artı: en iyi dayanıklılık/ölçek
   - Eksi: ek altyapı.

Senin hedefin için en doğru denge: **1 veya 2**. Trafik yükselirse 3'e geçilir.

---

## 5.3 `GET /api/stats/:alias`

### Akış

1. Alias var mı kontrol et (`EXISTS url:{alias}` veya alternatif strateji).
2. `GET clicks:{alias}`
3. `HGETALL stats:{alias}`
4. Tarihe göre sıralayıp frontend formatına map et.

### Chart.js dostu yanıt (öneri)

```json
{
  "alias": "kampanya2026",
  "totalClicks": 42,
  "series": {
    "labels": ["2026-05-04", "2026-05-05", "2026-05-06"],
    "data": [5, 11, 26]
  }
}
```

Alternatif olarak frontend map yapsın istersen:

```json
{
  "alias": "kampanya2026",
  "totalClicks": 42,
  "daily": {
    "2026-05-04": 5,
    "2026-05-05": 11,
    "2026-05-06": 26
  }
}
```

Backend'in direkt `labels/data` dönmesi, frontend karmaşıklığını azaltır.

---

## 6) Validasyon ve Güvenlik Derinleştirme

## 6.1 URL validasyonu

Önerilen kontroller:
- `new URL(originalUrl)` parse edilebilmeli
- sadece `http:` ve `https:` kabul
- maksimum URL uzunluğu (örn. 2048)

Opsiyonel kurumsal kontroller:
- private IP/domain engelleme (SSRF benzeri riskleri azaltır)
- blacklist/allowlist

## 6.2 Alias validasyonu

- regex: `^[a-zA-Z0-9_-]{3,32}$`
- sistem route'larıyla çakışmasın (`api`, `stats`, `health` vb.)
- case-sensitive mi insensitive mi baştan karar ver
  - sade yaklaşım: alias'ı lowercase'e normalize et

## 6.3 Abuse korumaları

- rate limit (`/api/shorten`)
- basic bot koruması (ileri aşamada captcha)
- CORS'i sadece frontend origin'e aç
- güvenli header'lar (`helmet`)

---

## 7) Tutarlılık, Atomiklik, Yarış Koşulları

## 7.1 Custom alias çakışması

`EXISTS` + `SET` iki adım yarış koşuluna açık olabilir (çok eşzamanlı isteklerde).

Daha güvenli yaklaşım:
- `SET url:{alias} {originalUrl} NX` kullan.
- Komut `null` dönerse alias dolu demektir.

Bu sayede alias tahsisi tek komutta atomik olur.

## 7.2 Otomatik alias çakışması

`nanoid` çakışma olasılığı çok düşüktür, ama sıfır değildir.
- `SET ... NX` + retry loop ile tamamen güvenli hale gelir.

## 7.3 Analytics güncelleme

`INCR` ve `HINCRBY` ayrı komutlardır; biri başarılı diğeri başarısız olabilir.
- üretim kalitesi için pipeline/transaction önerilir.

---

## 8) Performans ve Ölçekleme Notları

- Redis lookup ve increment işlemleri çok hızlıdır; düşük gecikme için uygun.
- Redirect endpoint'i I/O ağırlıklıdır; Express tek başına yeterli.
- Trafik artınca:
  - yatay ölçekli Node instance'ları
  - Redis managed servis/cluster
  - read/write gözlemi için metrik dashboard

Beklenen darboğaz sırası genelde:
1. Ağ ve reverse proxy ayarları
2. Redis bağlantı yönetimi (pool/reconnect)
3. Abuse trafiği

---

## 9) Operasyonel Gereksinimler

## 9.1 Gözlemlenebilirlik

Önerilen metrikler:
- shorten request sayısı / hata oranı
- redirect latency p50/p95
- redirect 404 oranı
- Redis command error/retry sayısı

Önerilen log alanları:
- `requestId`, `alias`, `statusCode`, `route`, `durationMs`
- PII/minimum veri prensibiyle logla

## 9.2 Health check

- `GET /health` -> process up
- `GET /ready` -> Redis ping başarılı

---

## 10) Frontend Akışı (Uygulama Prensipleri)

## 10.1 Ana Sayfa (kısaltıcı)

- Form alanları: `originalUrl`, `customAlias?`
- submit -> `/api/shorten`
- success:
  - kısa link metni
  - `Kopyala` butonu (`navigator.clipboard.writeText`)
- error state:
  - 409 alias dolu
  - 429 çok istek
  - genel hata mesajı

## 10.2 Stats sayfası (`/stats/:alias`)

- `useEffect` ile `/api/stats/:alias`
- skor kartı: toplam tıklanma
- line chart: `labels` + `datasets[0].data`
- loading/empty/error durumlarını ayrı ele al

---

## 11) Önerilen API Sözleşmesi (Kısa)

- `POST /api/shorten`
  - `200/201`: `{ alias, shortUrl, originalUrl, expiresInDays }`
  - `400/409/429/500`
- `GET /:alias`
  - `302` redirect
  - `404` not found
- `GET /api/stats/:alias`
  - `200`: `{ alias, totalClicks, series: { labels, data } }`
  - `404`: alias yok

---

## 12) Uygulama Aşamaları (Roadmap)

1. **MVP çekirdeği**
   - shorten + redirect + stats
2. **Sağlamlaştırma**
   - `SET NX`, validasyonlar, hata modeli
3. **Koruma katmanı**
   - rate limit + CORS + helmet
4. **Yaşam döngüsü**
   - TTL stratejisi + orphan önleme
5. **İzlenebilirlik**
   - health/readiness + metrik/log standardı
6. **İleri ölçek**
   - queue tabanlı analytics (gerektiğinde)

---

## 13) Riskler ve Azaltma Planı

- **Alias çakışması / yarış koşulu** -> `SET NX` + retry
- **Redis geçici kesinti** -> retry/backoff + degrade mesajı
- **Abuse/spam link üretimi** -> rate limit + opsiyonel captcha
- **Yetim analytics key'leri** -> TTL senkronizasyonu
- **Phishing amaçlı kullanım** -> domain policy ve raporlama (gelecek faz)

---

## 14) Sonuç

Planladığın akış teknik olarak doğru ve MVP için güçlü bir temel veriyor. Üretim kalitesine yaklaşmak için kritik farkı yaratan noktalar:
- alias tahsisinde atomiklik (`SET NX`),
- TTL'nin tüm ilgili key'lerle tutarlı ele alınması,
- redirect performansını korurken analytics güncelleme stratejisinin bilinçli seçimi,
- `/api/shorten` üzerinde rate limiting.

Bu kararlarla sistem hem hızlı başlar hem de trafiğe göre kontrollü büyür.
