const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or malformed Authorization header. Expected: Bearer <token>.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload; // { studentId, orgId, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token — please log in again.' });
  }
}

// Operator-only endpoints (all tickets, evaluation metrics). There is no
// admin role on User, so these use a shared key from ADMIN_API_KEY, sent as
// the x-admin-key header. Fails closed if the key isn't configured.
function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(503).json({ error: 'admin_disabled', message: 'Admin endpoints are disabled: ADMIN_API_KEY is not set.' });
  }
  const provided = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const expected = Buffer.from(config.adminApiKey);
  const ok = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
  if (!ok) {
    return res.status(403).json({ error: 'forbidden', message: 'Missing or invalid x-admin-key header.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
