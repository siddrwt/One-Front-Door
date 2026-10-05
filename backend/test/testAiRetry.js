const http = require('http');
const config = require('../src/config');
const { callPipeline } = require('../src/services/aiService');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

async function runTests() {
  const originalUrl = config.aiServiceUrl;
  const originalTimeout = config.aiServiceTimeoutMs;
  const originalUseMock = config.useMockAi;

  config.useMockAi = false;

  let requestCount = 0;
  let serverHandler = (req, res) => res.writeHead(200).end();

  const testServer = http.createServer((req, res) => {
    requestCount++;
    serverHandler(req, res);
  });

  await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
  const port = testServer.address().port;
  config.aiServiceUrl = `http://127.0.0.1:${port}/api/v1/chat`;

  try {
    // -------------------------------------------------------------
    // Test 1: Successful request
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Successful Request ---');
    requestCount = 0;
    serverHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        domain: 'fees_finance',
        confidence: 0.95,
        response: 'Fee schedule info',
        domain_scores: { fees_finance: 0.95 },
        domains: ['fees_finance']
      }));
    };

    let result = await callPipeline({
      query: 'When is tuition due?',
      orgId: 'bennett-university',
      enabledDomains: ['fees', 'examination', 'it', 'facilities', 'career_services']
    });

    assert(requestCount === 1, `Expected 1 attempt, got ${requestCount}`);
    assert(result.type === 'answer', `Expected type "answer", got "${result.type}"`);

    // -------------------------------------------------------------
    // Test 2: Temporary 503 followed by success
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Temporary 503 Followed by Success ---');
    requestCount = 0;
    serverHandler = (req, res) => {
      if (requestCount === 1) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Model loading' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          domain: 'fees_finance',
          confidence: 0.95,
          response: 'Fee schedule info after recovery',
          domain_scores: { fees_finance: 0.95 },
          domains: ['fees_finance']
        }));
      }
    };

    result = await callPipeline({
      query: 'When is tuition due?',
      orgId: 'bennett-university',
      enabledDomains: ['fees', 'examination', 'it', 'facilities', 'career_services']
    });

    assert(requestCount === 2, `Expected 2 attempts (1 retry), got ${requestCount}`);
    assert(result.type === 'answer', `Expected type "answer", got "${result.type}"`);

    // -------------------------------------------------------------
    // Test 3: Repeated 503 ending in handoff
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Repeated 503 Ending in Handoff ---');
    requestCount = 0;
    serverHandler = (req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service Unavailable' }));
    };

    result = await callPipeline({
      query: 'When is tuition due?',
      orgId: 'bennett-university',
      enabledDomains: ['fees', 'examination', 'it', 'facilities', 'career_services']
    });

    // 1 initial + 2 retries = 3 attempts total
    assert(requestCount === 3, `Expected 3 attempts (initial + 2 retries), got ${requestCount}`);
    assert(result.type === 'handoff', `Expected type "handoff", got "${result.type}"`);
    assert(result.reason === 'ai_http_error', `Expected reason "ai_http_error", got "${result.reason}"`);

    // -------------------------------------------------------------
    // Test 4: Timeout ending in handoff
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Timeout Ending in Handoff ---');
    requestCount = 0;
    config.aiServiceTimeoutMs = 100; // Small timeout for test speed
    serverHandler = (req, res) => {
      // Intentionally do not respond, causing timeout
    };

    result = await callPipeline({
      query: 'When is tuition due?',
      orgId: 'bennett-university',
      enabledDomains: ['fees', 'examination', 'it', 'facilities', 'career_services']
    });

    // 1 initial + 2 retries = 3 attempts total
    assert(requestCount === 3, `Expected 3 attempts (initial + 2 retries), got ${requestCount}`);
    assert(result.type === 'handoff', `Expected type "handoff", got "${result.type}"`);
    assert(result.reason === 'ai_timeout', `Expected reason "ai_timeout", got "${result.reason}"`);

    // -------------------------------------------------------------
    // Test 5 (Sanity): Permanent 400 client error must NOT retry
    // -------------------------------------------------------------
    console.log('\n--- 5. Verifying Non-Retryable Client Error (400) ---');
    requestCount = 0;
    config.aiServiceTimeoutMs = 5000;
    serverHandler = (req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request' }));
    };

    result = await callPipeline({
      query: 'When is tuition due?',
      orgId: 'bennett-university',
      enabledDomains: ['fees', 'examination', 'it', 'facilities', 'career_services']
    });

    assert(requestCount === 1, `Expected exactly 1 attempt (no retries for 400), got ${requestCount}`);
    assert(result.type === 'handoff', `Expected type "handoff", got "${result.type}"`);

    console.log('\nALL RETRY SCENARIOS PASSED SUCCESSFULLY!');
  } finally {
    testServer.close();
    config.aiServiceUrl = originalUrl;
    config.aiServiceTimeoutMs = originalTimeout;
    config.useMockAi = originalUseMock;
  }
}

runTests().catch((err) => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
