function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...defaultHeaders(),
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, {
    error: message
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        const error = new Error('request body must be valid JSON');
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function defaultHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

module.exports = {
  readJson,
  sendJson,
  sendError
};

