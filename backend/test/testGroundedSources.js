const config = require('../src/config');
const { normalizeAiResponse } = require('../src/services/aiService');
const { isUnavailablePersonalData } = require('../src/utils/guardrail');
const { produceResult, toClientResponse } = require('../src/controllers/chatController');
const Organization = require('../src/models/Organization');
const User = require('../src/models/User');
const { OUR_DOMAINS } = require('../src/config/domains');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

async function run() {
  console.log('======================================================');
  console.log('TESTING GROUNDED SOURCES & GUARDRAILS (REQUIRE_SOURCES=true)');
  console.log('======================================================\n');

  console.log('config.requireSources is:', config.requireSources);
  assert(config.requireSources === true, 'config.requireSources must be true');

  // Stub DB lookups for unit testing
  Organization.findOne = () => ({
    lean: async () => ({ enabledDomains: OUR_DOMAINS })
  });
  User.findOne = () => ({
    lean: async () => ({
      studentId: 'student-1',
      profile: {
        attendancePercent: 88,
        feeBalance: 0,
        program: 'B.Tech CSE',
        semester: 5,
        hostelRoom: 'C-204'
      }
    })
  });

  // -------------------------------------------------------------
  // Test 1: Valid question with valid sources -> answer
  // -------------------------------------------------------------
  console.log('\n--- 1. Valid Question with Valid Sources ---');
  const validSourcedAiRaw = {
    decision: 'answer',
    domain: 'Fees & Finance',
    confidence: 0.92,
    answer: 'The semester fee deadline is November 15, as published in the fee schedule.',
    sources: [
      { document: 'fee_policy.pdf', section: 'Deadlines', score: 0.89 }
    ]
  };

  const normSourced = normalizeAiResponse(validSourcedAiRaw, { requireSources: true });
  console.log('Result 1 type:', normSourced.type, 'replyKind:', normSourced.replyKind, 'sources:', normSourced.sources.length);
  assert(normSourced.type === 'answer', 'Result 1 must be type "answer"');
  assert(normSourced.replyKind === null, 'Result 1 replyKind must be null (grounded answer)');
  assert(normSourced.sources.length === 1, 'Result 1 must preserve valid sources');
  console.log('✔ Test 1 PASSED: Valid sourced answer passes through as grounded answer');

  // -------------------------------------------------------------
  // Test 2: Question with no relevant knowledge -> no_answer/handoff
  // -------------------------------------------------------------
  console.log('\n--- 2. Question with No Relevant Knowledge ---');
  const noKnowledgeAiRaw = {
    decision: 'no_answer',
    domain: 'Fees & Finance',
    no_answer: true,
    sources: []
  };

  const normNoKnowledge = normalizeAiResponse(noKnowledgeAiRaw, { requireSources: true });
  console.log('Result 2 type:', normNoKnowledge.type, 'replyKind:', normNoKnowledge.replyKind, 'answer:', normNoKnowledge.answer);
  assert(normNoKnowledge.type === 'answer', 'Result 2 must be type "answer"');
  assert(normNoKnowledge.replyKind === 'no_answer', 'Result 2 replyKind must be "no_answer"');
  assert(/Fees department/.test(normNoKnowledge.answer), 'Result 2 should point to relevant department');
  console.log('✔ Test 2 PASSED: Question with no relevant knowledge converts to department no_answer');

  // -------------------------------------------------------------
  // Test 3: AI response with answer but empty sources -> no_answer/handoff
  // -------------------------------------------------------------
  console.log('\n--- 3. AI Response with Answer but Empty Sources ---');
  const ungroundedAiRaw = {
    decision: 'answer',
    domain: 'Fees & Finance',
    confidence: 0.90,
    answer: 'I believe fees can be paid in cash at the counter.', // Hallucinated / ungrounded text without sources
    sources: [] // EMPTY SOURCES
  };

  const normUngrounded = normalizeAiResponse(ungroundedAiRaw, { requireSources: true });
  console.log('Result 3 type:', normUngrounded.type, 'replyKind:', normUngrounded.replyKind, 'answer:', normUngrounded.answer);
  assert(normUngrounded.type === 'answer', 'Result 3 must be type "answer"');
  assert(normUngrounded.replyKind === 'no_answer', 'Result 3 replyKind must be converted to "no_answer" because sources are empty');
  assert(/Fees department/.test(normUngrounded.answer), 'Result 3 answer must be replaced with department fallback');
  console.log('✔ Test 3 PASSED: Ungrounded answer with empty sources converted to no_answer fallback');

  // -------------------------------------------------------------
  // Test 4: Personal student-data question -> existing personal-data guardrail
  // -------------------------------------------------------------
  console.log('\n--- 4. Personal Student-Data Question ---');
  const blockedQuestion = 'What are my results?';
  const isBlocked = isUnavailablePersonalData(blockedQuestion);
  console.log(`Checking "${blockedQuestion}": isUnavailablePersonalData = ${isBlocked}`);
  assert(isBlocked === true, 'Personal data not held must trigger guardrail');

  const resultBlocked = await produceResult({
    message: blockedQuestion,
    orgId: 'bennett-university',
    studentId: 'student-1',
    conversationId: 'conv-guardrail'
  });
  console.log('Result 4 replyKind:', resultBlocked.replyKind, 'answer:', resultBlocked.answer);
  assert(resultBlocked.replyKind === 'personal_data_unavailable', 'Result 4 must trigger personal_data_unavailable');
  assert(/examination portal|grades|marks/i.test(resultBlocked.answer), 'Result 4 must return portal guidance message');
  console.log('✔ Test 4 PASSED: Personal student-data query blocked before AI by existing guardrail');

  console.log('\n======================================================');
  console.log('ALL GROUNDED SOURCES & GUARDRAIL TESTS PASSED!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
