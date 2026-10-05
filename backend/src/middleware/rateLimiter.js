const rateLimit = require('express-rate-limit');
const config = require('../config');

// Protects the AI backend (Ollama etc.) from being hammered, especially
// right before/during a live demo.
const chatRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests — please slow down.' },
});

module.exports = { chatRateLimiter };

// Brute-force protection for login/signup. skipSuccessfulRequests means a
// normal user logging in repeatedly never hits the limit; only failed
// attempts (wrong password, duplicate signup, bad input) are counted.
const authRateLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many failed attempts — try again later.' },
});

module.exports.authRateLimiter = authRateLimiter;
