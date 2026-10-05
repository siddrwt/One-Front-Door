/**
 * Runs the mock AI as a standalone HTTP service on :8000, same paths as the
 * AI team's FastAPI app. Use it to exercise the REAL HTTP integration path
 * before their service is ready:
 *
 *   npm run mock:ai                       (terminal 1)
 *   USE_MOCK_AI=false npm run dev         (terminal 2, AI_SERVICE_URL default)
 */
const { createMockAiApp } = require('../src/mock/mockAiServer');
const port = Number(process.env.MOCK_AI_PORT) || 8000;
createMockAiApp().listen(port, () => console.log(`[mock-ai] listening on http://127.0.0.1:${port}/api/v1/chat`));
