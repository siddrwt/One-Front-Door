require('dotenv').config();
const config = require('../src/config');
const { callPipeline } = require('../src/services/aiService');
const { aiHealth } = require('../src/controllers/healthController');

async function main() {
  console.log('=== CONFIGURATION ===');
  console.log('USE_MOCK_AI:', config.useMockAi);
  console.log('AI_SERVICE_URL:', config.aiServiceUrl);

  console.log('\n=== HEALTH CHECK TEST ===');
  const mockRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('Status code:', this.statusCode);
      console.log('Health response:', JSON.stringify(data, null, 2));
    }
  };
  await aiHealth({}, mockRes);

  console.log('\n=== LIVE QUERY TEST ===');
  const query = 'When is the semester fee due?';
  console.log('Query:', query);
  const result = await callPipeline({
    query,
    orgId: 'bennett-university',
    conversationId: 'test-live-hf',
    enabledDomains: ['fees', 'examination', 'it', 'facilities', 'career_services']
  });

  console.log('Normalized Response Type:', result.type);
  console.log('Result payload:', JSON.stringify(result, null, 2));

  const validTypes = ['answer', 'clarification', 'multi_answer', 'handoff'];
  const isValid = validTypes.includes(result.type);
  console.log('\nResponse normalized into valid core type?:', isValid ? 'YES (' + result.type + ')' : 'NO');
}

main().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
