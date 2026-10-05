const CODES = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'bad_request', message: `Invalid value for "${err.path}".` });
  }
  const status = err.status || 500;
  // Only unexpected failures are logged with a stack; 4xx are normal client errors.
  if (status >= 500) console.error('[error]', req.id || '-', err);
  res.status(status).json({
    error: CODES[status] || (status >= 500 ? 'internal_error' : 'request_error'),
    message: status >= 500 ? 'Something went wrong on our end.' : err.message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
