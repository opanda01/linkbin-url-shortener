const { randomBytes } = require('node:crypto');
const { getRedisClient } = require('./redis.service');
const { env } = require('../lib/env');

const URL_TTL_SECONDS = env.URL_TTL_SECONDS;

// Redis key şemaları
const keys = {
  url: (code) => `url:${code}`,
  meta: (code) => `meta:${code}`,
  clicks: (code) => `clicks:${code}`,
  stats: (code) => `stats:${code}`
};

function createShortenerService(options = {}) {
  const redisClientFactory = options.getRedisClient || getRedisClient;

  return {
    async shorten(payload) {
      if (!payload || typeof payload.url !== 'string') {
        return fail(400, 'url is required');
      }

      if (!isValidHttpUrl(payload.url)) {
        return fail(400, 'url must be a valid http or https URL');
      }

      const code = normalizeCode(payload.alias) || createCode();
      const redis = await redisClientFactory();

      // Atomik kontrol: SET NX → null dönerse alias dolu
      const set = await redis.set(keys.url(code), payload.url, {
        NX: true,
        EX: URL_TTL_SECONDS
      });

      if (set === null) {
        return fail(409, 'alias is already in use');
      }

      const createdAt = new Date().toISOString();

      // Meta ve sayaçları kaydet, aynı TTL ile
      await redis.hSet(keys.meta(code), { url: payload.url, createdAt });
      await redis.expire(keys.meta(code), URL_TTL_SECONDS);
      await redis.set(keys.clicks(code), 0, { EX: URL_TTL_SECONDS });

      return ok({
        code,
        url: payload.url,
        shortPath: `/${code}`,
        shortUrl: `${env.BASE_URL}/${code}`,
        createdAt
      });
    },

    async resolve(code) {
      const redis = await redisClientFactory();
      const url = await redis.get(keys.url(code));

      if (!url) {
        return fail(404, 'link not found');
      }

      // Fire-and-forget: redirect gecikmeden dönsün
      const today = todayKey();
      redis.incr(keys.clicks(code)).catch(() => {});
      redis.hIncrBy(keys.stats(code), today, 1)
        .then(() => redis.expire(keys.stats(code), URL_TTL_SECONDS))
        .catch(() => {});

      return ok({ url });
    },

    async stats(code) {
      const redis = await redisClientFactory();

      const [meta, clicks, daily, ttl] = await Promise.all([
        redis.hGetAll(keys.meta(code)),
        redis.get(keys.clicks(code)),
        redis.hGetAll(keys.stats(code)),
        redis.ttl(keys.url(code))
      ]);

      if (!meta || !meta.url) {
        return fail(404, 'link not found');
      }

      // Günlük verileri tarihe göre sırala
      const sortedDays = Object.keys(daily).sort();
      const series = {
        labels: sortedDays,
        data: sortedDays.map((d) => Number(daily[d]))
      };

      // Son tıklama tarihi (en son günlük key)
      const lastClickAt = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : null;

      return ok({
        code,
        url: meta.url,
        createdAt: meta.createdAt,
        clicks: Number(clicks || 0),
        ttlDays: ttl > 0 ? Math.ceil(ttl / 86400) : null,
        lastClickAt,
        series
      });
    },

    async ping() {
      const redis = await redisClientFactory();
      const result = await redis.ping();
      return result === 'PONG';
    }
  };
}

function normalizeCode(alias) {
  if (typeof alias !== 'string' || alias.trim() === '') return null;
  const code = alias.trim();
  return /^[a-zA-Z0-9_-]{3,32}$/.test(code) ? code : null;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function createCode() {
  return randomBytes(6).toString('base64url');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function ok(data) {
  return { ok: true, data };
}

function fail(statusCode, message) {
  return { ok: false, statusCode, message };
}

module.exports = {
  createShortenerService
};


