const { createClient } = require('redis');
const { env } = require('../lib/env');

let client = null;
let connectPromise = null;

async function getRedisClient() {
  if (client && client.isReady) return client;

  // Birden fazla eş zamanlı çağrıda tek bağlantı bekle
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    client = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= 5) {
            // 5 denemeden sonra bağlantıyı durdur
            process.stderr.write('redis: max retries reached, giving up\n');
            return new Error('Redis bağlantısı kurulamadı');
          }
          // Exponential backoff: 200ms, 400ms, 800ms...
          return Math.min(200 * Math.pow(2, retries), 3000);
        },
        connectTimeout: 5000
      }
    });

    client.on('error', (err) => {
      // Bağlantı hatalarını sadece bir kez logla (döngüyü önle)
      if (!client._lastErrMsg || client._lastErrMsg !== err.code) {
        process.stderr.write(`redis error: ${err.code || err.message}\n`);
        client._lastErrMsg = err.code;
      }
    });

    client.on('ready', () => {
      client._lastErrMsg = null;
      process.stdout.write('redis: connected\n');
    });

    await client.connect();
    return client;
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

async function disconnectRedis() {
  if (client) {
    await client.disconnect();
    client = null;
  }
}

module.exports = {
  getRedisClient,
  disconnectRedis
};


