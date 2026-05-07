const { sendJson, sendError } = require('../lib/http');

async function handleStats(req, res, shortenerService, url) {
  const code = decodeURIComponent(url.pathname.replace('/api/stats/', ''));
  const result = await shortenerService.stats(code);

  if (!result.ok) {
    sendError(res, result.statusCode, result.message);
    return;
  }

  sendJson(res, 200, result.data);
}

module.exports = {
  handleStats
};

