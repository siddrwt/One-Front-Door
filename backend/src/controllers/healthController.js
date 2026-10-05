const axios = require('axios');
const config = require('../config');

function aiHealthUrl() {
  if (config.aiHealthUrl) return config.aiHealthUrl;
  const isHf = /huggingface\.co/.test(config.aiServiceUrl);
  if (isHf) {
    const match = config.aiServiceUrl.match(/models\/([^/]+\/[^/]+)/);
    if (match) return `https://huggingface.co/api/models/${match[1]}`;
    return config.aiServiceUrl;
  }
  const baseUrl = new URL(config.aiServiceUrl).origin;
  const healthPath = config.aiServiceHealthPath || '/api/v1/health';
  return `${baseUrl.replace(/\/+$/, '')}/${healthPath.replace(/^\/+/, '')}`;
}

/** GET /health/ai -- is the AI service reachable? (Doesn't send any student data.) */
async function aiHealth(req, res) {
  if (config.useMockAi) return res.json({ status: 'ok', mode: 'mock' });
  try {
    const headers = config.aiServiceApiKey ? { Authorization: `Bearer ${config.aiServiceApiKey}` } : {};
    const r = await axios.get(aiHealthUrl(), { timeout: 5000, headers });
    return res.json({ status: 'ok', mode: 'live', aiService: r.data });
  } catch (err) {
    return res.status(503).json({ status: 'unreachable', mode: 'live', message: err.message });
  }
}

module.exports = { aiHealth };
