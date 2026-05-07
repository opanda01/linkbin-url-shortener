const http = require('http');
const { createApp, disconnectRedis } = require('./app');
const { env } = require('./lib/env');

const server = http.createServer(createApp());

server.listen(env.PORT, () => {
  process.stdout.write(`api listening on http://localhost:${env.PORT}\n`);
});

async function shutdown(signal) {
  process.stdout.write(`${signal} received, shutting down...\n`);
  server.close(async () => {
    await disconnectRedis();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));


