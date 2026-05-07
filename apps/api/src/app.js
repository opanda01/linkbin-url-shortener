const { createShortenerService } = require('./services/shortener.service');
const { disconnectRedis } = require('./services/redis.service');
const { handleShorten } = require('./routes/shorten.route');
const { handleRedirect } = require('./routes/redirect.route');
const { handleStats } = require('./routes/stats.route');
const { sendJson, sendError } = require('./lib/http');
const { createRateLimiter } = require('./lib/rate-limit');
const { env } = require('./lib/env');

function createApp(options = {}) {
  const shortenerService = options.shortenerService || createShortenerService();
  const rateLimiter = options.rateLimiter || createRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX
  });

  return async function app(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders());
        res.end();
        return;
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/ready') {
        const alive = await shortenerService.ping().catch(() => false);
        if (alive) {
          sendJson(res, 200, { ok: true });
        } else {
          sendError(res, 503, 'redis unavailable');
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/shorten') {
        const ip = clientIp(req);
        const { allowed, retryAfterSec } = rateLimiter.check(ip);

        if (!allowed) {
          res.writeHead(429, {
            ...corsHeaders(),
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSec)
          });
          res.end(JSON.stringify({ error: 'Too many requests', retryAfterSec }));
          return;
        }

        await handleShorten(req, res, shortenerService);
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/stats/')) {
        await handleStats(req, res, shortenerService, url);
        return;
      }

      if (req.method === 'GET' && url.pathname.length > 1) {
        await handleRedirect(res, shortenerService, url);
        return;
      }

      sendError(res, 404, 'Route not found');
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message || 'Unexpected error');
    }
  };
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

module.exports = {
  createApp,
  disconnectRedis
};



