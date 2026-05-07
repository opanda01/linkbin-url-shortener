const { sendError } = require('../lib/http');

async function handleRedirect(res, shortenerService, url) {
  const code = decodeURIComponent(url.pathname.slice(1));
  const result = await shortenerService.resolve(code);

  if (!result.ok) {
    sendError(res, result.statusCode, result.message);
    return;
  }

  res.writeHead(302, {
    Location: result.data.url
  });
  res.end();
}

module.exports = {
  handleRedirect
};

