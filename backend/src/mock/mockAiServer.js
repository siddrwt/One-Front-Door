const express = require('express');
const { mockAiRaw } = require('./mockAi');

/** The mock AI as a real HTTP service, same paths as the AI team's FastAPI app. */
function createMockAiApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', mock: true }));

  app.post('/api/v1/chat', (req, res) => {
    if (typeof req.body?.query !== 'string' || !req.body.query.trim()) {
      return res.status(422).json({ detail: 'query is required' });
    }
    return res.json(mockAiRaw(req.body));
  });

  return app;
}

module.exports = { createMockAiApp };
