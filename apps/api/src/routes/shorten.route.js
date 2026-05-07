const { readJson, sendJson, sendError } = require('../lib/http');

async function handleShorten(req, res, shortenerService) {
  const body = await readJson(req);
  const result = await shortenerService.shorten(body);

  if (!result.ok) {
    sendError(res, result.statusCode, result.message);
    return;
  }

  sendJson(res, 201, result.data);
}

module.exports = {
  handleShorten
};

