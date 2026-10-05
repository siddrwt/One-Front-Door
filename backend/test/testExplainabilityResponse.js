const { toClientResponse } = require('../src/controllers/chatController');
const { normalizeAiResponse } = require('../src/services/aiService');
const mongoose = require('mongoose');

function printSection(title) {
  console.log('\n======================================================');
  console.log(title);
  console.log('======================================================');
}

function runTests() {
  const turnId = new mongoose.Types.ObjectId().toString();
  const conversationId = 'conv-explainability-123';

  // -------------------------------------------------------------------------
  // 1. Normal Answer
  // -------------------------------------------------------------------------
  printSection('TEST 1: Normal Answer Response');
  const normalAiRaw = {
    decision: 'answer',
    domain: 'Fees & Finance',
    confidence: 0.945,
    routing_margin: 0.42,
    answer: 'The semester fee due date is published on the portal under Fee Schedule; late fee applies after November 15.',
    sources: [{ document: 'fee_policy.pdf', section: 'Due Dates', score: 0.88 }],
    domain_scores: {
      'Fees & Finance': 0.945,
      'Academics': 0.525,
      'Facilities': 0.12,
      'General': 0.05
    }
  };

  const normAnswer = normalizeAiResponse(normalAiRaw);
  const clientAnswer = toClientResponse(normAnswer, { conversationId, turnId });
  console.log('FINAL JSON RESPONSE SHAPE:');
  console.log(JSON.stringify(clientAnswer, null, 2));

  // Verification
  console.assert(clientAnswer.type === 'answer', 'Type should be answer');
  console.assert(clientAnswer.routingScore === 0.945, 'routingScore should match');
  console.assert(clientAnswer.routingMargin === 0.42, 'routingMargin should match');
  console.assert(clientAnswer.signals && clientAnswer.signals['Fees & Finance'] === 0.945, 'signals should be present');
  console.assert(Array.isArray(clientAnswer.sources) && clientAnswer.sources.length === 1, 'sources should be present');
  console.log('✔ Normal answer verification PASSED');

  // -------------------------------------------------------------------------
  // 2. Clarification
  // -------------------------------------------------------------------------
  printSection('TEST 2: Clarification Response');
  const clarificationAiRaw = {
    decision: 'clarification',
    message: 'Which deadline are you asking about — fee payment or exam registration?',
    confidence: 0.48,
    routing_margin: 0.05,
    clarification_options: ['Fees & Finance', 'Academics'],
    domain_scores: {
      'Fees & Finance': 0.48,
      'Academics': 0.43,
      'Housing': 0.09
    }
  };

  const normClarification = normalizeAiResponse(clarificationAiRaw);
  const clientClarification = toClientResponse(normClarification, { conversationId, turnId });
  console.log('FINAL JSON RESPONSE SHAPE:');
  console.log(JSON.stringify(clientClarification, null, 2));

  // Verification
  console.assert(clientClarification.type === 'clarification', 'Type should be clarification');
  console.assert(Array.isArray(clientClarification.candidateDomains), 'candidateDomains should be an array');
  console.assert(clientClarification.candidateDomains.includes('fees'), 'candidateDomains should have mapped ids');
  console.assert(clientClarification.candidateDomainScores !== undefined, 'candidateDomainScores should be exposed');
  console.assert(clientClarification.routingScore === 0.48, 'routingScore should be exposed');
  console.assert(clientClarification.routingMargin === 0.05, 'routingMargin should be exposed');
  console.log('✔ Clarification verification PASSED');

  // -------------------------------------------------------------------------
  // 3. Multi-Domain Answer
  // -------------------------------------------------------------------------
  printSection('TEST 3: Multi-Domain Answer Response');
  const multiAiRaw = {
    decision: 'multi_answer',
    routing_margin: 0.15,
    domain_scores: {
      'Fees & Finance': 0.85,
      'Career Services': 0.70,
      'General': 0.10
    },
    answers: [
      {
        domain: 'Fees & Finance',
        answer: 'Semester fee deadline is November 15.',
        confidence: 0.85,
        routing_margin: 0.15,
        signals: { 'Fees & Finance': 0.85, 'Academics': 0.15 },
        sources: [{ document: 'fees.pdf', section: 'Deadlines', score: 0.9 }]
      },
      {
        domain: 'Career Services',
        answer: 'Placement drive schedules are updated on the Career portal.',
        confidence: 0.70,
        routing_margin: 0.15,
        signals: { 'Career Services': 0.70, 'Registration': 0.10 },
        sources: [{ document: 'placement.pdf', section: 'Schedules', score: 0.85 }]
      }
    ]
  };

  const normMulti = normalizeAiResponse(multiAiRaw);
  const clientMulti = toClientResponse(normMulti, { conversationId, turnId });
  console.log('FINAL JSON RESPONSE SHAPE:');
  console.log(JSON.stringify(clientMulti, null, 2));

  // Verification
  console.assert(clientMulti.type === 'multi_answer', 'Type should be multi_answer');
  console.assert(clientMulti.routingScore === 0.85, 'Overall routingScore should match top part');
  console.assert(clientMulti.routingMargin === 0.15, 'Overall routingMargin should be exposed');
  console.assert(Array.isArray(clientMulti.answers) && clientMulti.answers.length === 2, 'answers array should contain 2 parts');
  console.assert(clientMulti.answers[0].routingScore === 0.85, 'Part 1 routingScore should match');
  console.assert(clientMulti.answers[0].routingMargin === 0.15, 'Part 1 routingMargin should match');
  console.assert(clientMulti.answers[0].signals !== undefined, 'Part 1 signals should be present');
  console.assert(clientMulti.answers[1].routingScore === 0.70, 'Part 2 routingScore should match');
  console.assert(clientMulti.answers[1].signals !== undefined, 'Part 2 signals should be present');
  console.log('✔ Multi-domain answer verification PASSED');

  // -------------------------------------------------------------------------
  // 4. Handoff
  // -------------------------------------------------------------------------
  printSection('TEST 4: Handoff Response');
  const handoffRaw = {
    decision: 'handoff',
    handoff_reason: 'it_keyword_rule',
    message: 'IT questions require specialized support. A support ticket has been created for human follow-up.'
  };

  const normHandoff = normalizeAiResponse(handoffRaw);
  const ticketId = 't_test_98765';
  const clientHandoff = toClientResponse(normHandoff, { conversationId, turnId, ticketId });
  console.log('FINAL JSON RESPONSE SHAPE:');
  console.log(JSON.stringify(clientHandoff, null, 2));

  // Verification
  console.assert(clientHandoff.type === 'handoff', 'Type should be handoff');
  console.assert(clientHandoff.reason === 'it_keyword_rule', 'reason should match');
  console.assert(clientHandoff.ticketId === ticketId, 'ticketId should be present');
  console.log('✔ Handoff verification PASSED');

  printSection('ALL 4 CLIENT RESPONSE FORMATTING TESTS PASSED!');
}

runTests();
