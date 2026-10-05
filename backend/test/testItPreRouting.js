const config = require('../src/config');
const { isItQuestion, hasMultipleIntents, isClearlyItOnlyQuestion } = require('../src/utils/itKeywords');
const { produceResult, toClientResponse } = require('../src/controllers/chatController');
const Organization = require('../src/models/Organization');
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
  console.log('TESTING IT-SPECIFIC PRE-ROUTING LOGIC');
  console.log('======================================================\n');

  const User = require('../src/models/User');

  // Stub DB lookups so MongoDB is not required for unit testing
  Organization.findOne = () => ({
    lean: async () => ({ enabledDomains: OUR_DOMAINS })
  });
  User.findOne = () => ({
    lean: async () => null
  });

  config.useMockAi = true;
  config.itKeywordRule = true;

  // -------------------------------------------------------------
  // Test A: "How do I connect to campus WiFi?"
  // -------------------------------------------------------------
  console.log('--- Test A: "How do I connect to campus WiFi?" ---');
  const queryA = 'How do I connect to campus WiFi?';
  const isItA = isItQuestion(queryA);
  const multiA = hasMultipleIntents(queryA);
  const itOnlyA = isClearlyItOnlyQuestion(queryA);
  console.log(`isItQuestion: ${isItA}, hasMultipleIntents: ${multiA}, isClearlyItOnlyQuestion: ${itOnlyA}`);
  assert(itOnlyA === true, 'Query A must be recognized as clearly IT-only');

  const resultA = await produceResult({
    message: queryA,
    orgId: 'bennett-university',
    studentId: 'student-1',
    conversationId: 'conv-a'
  });
  console.log('Result A type:', resultA.type, 'reason:', resultA.reason);
  assert(resultA.type === 'handoff', 'Result A must be a handoff');
  assert(resultA.reason === 'it_keyword_rule', 'Result A reason must be it_keyword_rule');
  console.log('✔ Test A PASSED: Clearly IT-only issue routed to fast IT handling\n');

  // -------------------------------------------------------------
  // Test B: "Where do I pay hostel fees and how do I connect to campus WiFi?"
  // -------------------------------------------------------------
  console.log('--- Test B: "Where do I pay hostel fees and how do I connect to campus WiFi?" ---');
  const queryB = 'Where do I pay hostel fees and how do I connect to campus WiFi?';
  const isItB = isItQuestion(queryB);
  const multiB = hasMultipleIntents(queryB);
  const itOnlyB = isClearlyItOnlyQuestion(queryB);
  console.log(`isItQuestion: ${isItB}, hasMultipleIntents: ${multiB}, isClearlyItOnlyQuestion: ${itOnlyB}`);
  assert(multiB === true, 'Query B must be detected as having multiple intents');
  assert(itOnlyB === false, 'Query B must NOT be intercepted as clearly IT-only');

  const resultB = await produceResult({
    message: queryB,
    orgId: 'bennett-university',
    studentId: 'student-1',
    conversationId: 'conv-b'
  });
  console.log('Result B type:', resultB.type, 'domains:', resultB.domains);
  assert(resultB.type !== 'handoff', 'Result B must NOT be immediately handed off as IT');
  assert(resultB.type === 'multi_answer', 'Result B must be processed by multi-domain pipeline into multi_answer');
  assert(resultB.domains && resultB.domains.length >= 2, 'Result B must contain multiple domains');
  console.log('Client response shape for B:', JSON.stringify(toClientResponse(resultB, { conversationId: 'conv-b', turnId: 'turn-b' }), null, 2));
  console.log('✔ Test B PASSED: Multi-domain query processed by pipeline, NOT overridden by IT keyword\n');

  // -------------------------------------------------------------
  // Test C: "My laptop cannot connect to WiFi."
  // -------------------------------------------------------------
  console.log('--- Test C: "My laptop cannot connect to WiFi." ---');
  const queryC = 'My laptop cannot connect to WiFi.';
  const isItC = isItQuestion(queryC);
  const multiC = hasMultipleIntents(queryC);
  const itOnlyC = isClearlyItOnlyQuestion(queryC);
  console.log(`isItQuestion: ${isItC}, hasMultipleIntents: ${multiC}, isClearlyItOnlyQuestion: ${itOnlyC}`);
  assert(itOnlyC === true, 'Query C must be recognized as clearly IT-only');

  const resultC = await produceResult({
    message: queryC,
    orgId: 'bennett-university',
    studentId: 'student-1',
    conversationId: 'conv-c'
  });
  console.log('Result C type:', resultC.type, 'reason:', resultC.reason);
  assert(resultC.type === 'handoff', 'Result C must be a handoff');
  assert(resultC.reason === 'it_keyword_rule', 'Result C reason must be it_keyword_rule');
  console.log('✔ Test C PASSED: Clearly IT-only issue routed to fast IT handling\n');

  // -------------------------------------------------------------
  // Test D: "What is the hostel fee deadline and when is exam registration?"
  // -------------------------------------------------------------
  console.log('--- Test D: "What is the hostel fee deadline and when is exam registration?" ---');
  const queryD = 'What is the hostel fee deadline and when is exam registration?';
  const isItD = isItQuestion(queryD);
  const multiD = hasMultipleIntents(queryD);
  const itOnlyD = isClearlyItOnlyQuestion(queryD);
  console.log(`isItQuestion: ${isItD}, hasMultipleIntents: ${multiD}, isClearlyItOnlyQuestion: ${itOnlyD}`);
  assert(itOnlyD === false, 'Query D does not contain an IT question');

  const resultD = await produceResult({
    message: queryD,
    orgId: 'bennett-university',
    studentId: 'student-1',
    conversationId: 'conv-d'
  });
  console.log('Result D type:', resultD.type, 'domains:', resultD.domains);
  assert(resultD.type === 'multi_answer', 'Result D must be processed as multi_answer');
  assert(resultD.domains && resultD.domains.length >= 2, 'Result D must contain multiple domains');
  console.log('Client response shape for D:', JSON.stringify(toClientResponse(resultD, { conversationId: 'conv-d', turnId: 'turn-d' }), null, 2));
  console.log('✔ Test D PASSED: Multi-domain non-IT query processed normally\n');

  console.log('======================================================');
  console.log('ALL PRE-ROUTING IT TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
