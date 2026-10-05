require('dotenv').config();

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevLike = nodeEnv === 'development' || nodeEnv === 'test';

// Outside development/test the server refuses to start with a missing or
// default JWT secret — otherwise anyone could forge tokens.
const jwtSecret = process.env.JWT_SECRET || (isDevLike ? DEV_JWT_SECRET : null);
if (!jwtSecret || (!isDevLike && jwtSecret === DEV_JWT_SECRET)) {
  throw new Error(
    `JWT_SECRET must be set to a long random value when NODE_ENV="${nodeEnv}" (the dev default is not allowed).`
  );
}

function getEffectiveAiUrl() {
  const rawUrl = process.env.AI_SERVICE_URL;
  if (!rawUrl) {
    return 'https://router.huggingface.co/hf-inference/models/M1CR0W4V3/campus-assistant-router';
  }
  try {
    const parsed = new URL(rawUrl);
    if ((parsed.pathname === '/' || parsed.pathname === '') && process.env.AI_SERVICE_CHAT_PATH) {
      return `${rawUrl.replace(/\/+$/, '')}/${process.env.AI_SERVICE_CHAT_PATH.replace(/^\/+/, '')}`;
    }
  } catch (e) {}
  return rawUrl;
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv,

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_assistant',

  jwtSecret,

  // Guards /api/tickets and /api/evaluation (sent as the x-admin-key header).
  // If unset, those endpoints are disabled (fail closed).
  adminApiKey: process.env.ADMIN_API_KEY || null,

  // The AI team's FastAPI / Hugging Face model endpoint.
  aiServiceUrl: getEffectiveAiUrl(),
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || process.env.HF_TOKEN || null,
  aiHealthUrl: process.env.AI_HEALTH_URL || null,
  aiServiceChatPath: process.env.AI_SERVICE_CHAT_PATH || '/api/v1/chat',
  aiServiceHealthPath: process.env.AI_SERVICE_HEALTH_PATH || '/api/v1/health',
  aiServiceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 30000,
  useMockAi: (process.env.USE_MOCK_AI || 'false').toLowerCase() === 'true',

  // If true, a mapped-domain answer that comes back with NO sources is treated
  // as "nothing found" and replaced with the contact-the-department reply.
  // Leave false until the AI service reliably returns sources.
  requireSources: (process.env.REQUIRE_SOURCES || 'true').toLowerCase() === 'true',

  // Temporary keyword rule: IT questions -> human handoff. Set false once the
  // AI model has an IT label.
  itKeywordRule: (process.env.IT_KEYWORD_RULE || 'true').toLowerCase() === 'true',

  // Comma-separated frontend origins. Empty = allow all (dev only).
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Number of reverse proxies in front of the app (Render/Railway: 1). 0 = none.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,

  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,

  // Login/signup brute-force protection. Only FAILED attempts (4xx) count.
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,

  defaultOrgId: process.env.DEFAULT_ORG_ID || 'bennett-university',
};
