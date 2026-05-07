require('dotenv').config();

const env = {
  PORT: Number(process.env.PORT || 3001),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  URL_TTL_SECONDS: Number(process.env.URL_TTL_SECONDS || 2592000),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 900_000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 60)
};

module.exports = {
  env
};

