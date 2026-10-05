/**
 * test/testFeedback.js
 *
 * Dedicated test suite for the extended feedback system:
 * - Schema validation (Joi rules for categories, comment limits, required fields)
 * - Up/down backwards compatibility
 * - All 5 allowed feedback categories
 * - Comment length constraints (<= 500 characters)
 * - Turn ownership & cross-conversation security
 * - Persistence of feedback, category, comment, and timestamp on Turn
 * - Assistant vs user role enforcement
 *
 * Run: node test/testFeedback.js
 */

'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const { feedbackRequestSchema, ALLOWED_FEEDBACK_CATEGORIES } = require('../src/middleware/validate');
const Turn = require('../src/models/Turn');
const Conversation = require('../src/models/Conversation');
const { submitFeedback } = require('../src/controllers/feedbackController');

let passed = 0;
let failed = 0;

function check(desc, ok, extra) {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${desc}`, extra !== undefined ? extra : '');
  }
}

// ─── 1. Schema Validation Unit Tests ──────────────────────────────────────────

// Valid legacy up/down
{
  const resUp = feedbackRequestSchema.validate({ turnId: '507f1f77bcf86cd799439011', feedback: 'up' });
  check('schema: accepts legacy up without category or comment', !resUp.error);

  const resDown = feedbackRequestSchema.validate({ turnId: '507f1f77bcf86cd799439011', feedback: 'down' });
  check('schema: accepts legacy down without category or comment', !resDown.error);
}

// Valid categories
for (const cat of ALLOWED_FEEDBACK_CATEGORIES) {
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'down',
    category: cat,
  });
  check(`schema: accepts category "${cat}"`, !res.error);
}

// Valid full payload with comment
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'down',
    category: 'wrong_routing',
    comment: 'This should have been examination.',
  });
  check('schema: accepts valid full payload with comment', !res.error && res.value.comment === 'This should have been examination.');
}

// Comment exactly 500 characters
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'up',
    comment: 'c'.repeat(500),
  });
  check('schema: accepts comment of 500 characters', !res.error);
}

// Comment > 500 characters -> rejected
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'up',
    comment: 'c'.repeat(501),
  });
  check('schema: rejects comment > 500 characters', Boolean(res.error));
}

// Invalid category -> rejected
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'down',
    category: 'not_a_real_category',
  });
  check('schema: rejects unknown category', Boolean(res.error));
}

// Empty string category -> rejected
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'down',
    category: '',
  });
  check('schema: rejects empty category string', Boolean(res.error));
}

// Invalid feedback value -> rejected
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
    feedback: 'sideways',
  });
  check('schema: rejects invalid feedback value ("sideways")', Boolean(res.error));
}

// Missing feedback -> rejected
{
  const res = feedbackRequestSchema.validate({
    turnId: '507f1f77bcf86cd799439011',
  });
  check('schema: rejects missing feedback field', Boolean(res.error));
}

// Missing turnId -> rejected
{
  const res = feedbackRequestSchema.validate({
    feedback: 'up',
  });
  check('schema: rejects missing turnId field', Boolean(res.error));
}

// ─── 2. Controller & Business Logic Tests ─────────────────────────────────────
(async () => {
  // In-memory test store
  const mockTurns = [];
  const mockConversations = [];

  const origFindById = Turn.findById;
  const origConvFindOne = Conversation.findOne;

  Turn.findById = async (id) => mockTurns.find((t) => String(t._id) === String(id)) || null;
  Conversation.findOne = (q) => ({
    lean: () => Promise.resolve(mockConversations.find((c) => c.conversationId === q.conversationId) || null),
  });

  const studentAConvId = 'conv-user-A-101';
  const studentBConvId = 'conv-user-B-202';

  mockConversations.push(
    { conversationId: studentAConvId, studentId: 'student_A', orgId: 'bennett-university' },
    { conversationId: studentBConvId, studentId: 'student_B', orgId: 'bennett-university' }
  );

  const assistantTurnId = new mongoose.Types.ObjectId();
  const userTurnId = new mongoose.Types.ObjectId();
  const studentBTurnId = new mongoose.Types.ObjectId();

  const assistantTurn = {
    _id: assistantTurnId,
    conversationId: studentAConvId,
    orgId: 'bennett-university',
    role: 'assistant',
    text: 'Exam schedules are published on the portal.',
    feedback: null,
    feedbackCategory: null,
    feedbackComment: null,
    save: async function () { return this; },
  };

  const userTurn = {
    _id: userTurnId,
    conversationId: studentAConvId,
    orgId: 'bennett-university',
    role: 'user',
    text: 'When is my exam?',
    feedback: null,
    save: async function () { return this; },
  };

  const studentBTurn = {
    _id: studentBTurnId,
    conversationId: studentBConvId,
    orgId: 'bennett-university',
    role: 'assistant',
    text: 'Fee due date is next Friday.',
    feedback: null,
    save: async function () { return this; },
  };

  mockTurns.push(assistantTurn, userTurn, studentBTurn);

  function createMockReq(user, body) {
    return {
      user: user || { studentId: 'student_A', orgId: 'bennett-university' },
      body,
    };
  }

  function createMockRes() {
    const res = {
      statusCode: 200,
      body: null,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(b) {
        this.body = b;
        return this;
      },
    };
    return res;
  }

  // Test 1: Student A successfully submits feedback on own assistant turn with category and comment
  {
    const req = createMockReq({ studentId: 'student_A', orgId: 'bennett-university' }, {
      turnId: String(assistantTurnId),
      feedback: 'down',
      category: 'wrong_routing',
      comment: 'This should have been examination.',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: own turn feedback returns 200', res.statusCode === 200);
    check('controller: response contains turnId, feedback, category, comment',
      res.body.feedback === 'down' &&
      res.body.category === 'wrong_routing' &&
      res.body.comment === 'This should have been examination.'
    );
    check('controller: turn document updated in memory',
      assistantTurn.feedback === 'down' &&
      assistantTurn.feedbackCategory === 'wrong_routing' &&
      assistantTurn.feedbackComment === 'This should have been examination.' &&
      assistantTurn.feedbackAt instanceof Date
    );
  }

  // Test 2: Student A successfully submits legacy up feedback without category
  {
    const req = createMockReq({ studentId: 'student_A', orgId: 'bennett-university' }, {
      turnId: String(assistantTurnId),
      feedback: 'up',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: legacy up feedback returns 200', res.statusCode === 200);
    check('controller: legacy response has no category/comment keys',
      res.body.feedback === 'up' &&
      res.body.category === undefined &&
      res.body.comment === undefined
    );
  }

  // Test 3: Student B tries to give feedback on Student A's turn -> 404 (ownership check)
  {
    const req = createMockReq({ studentId: 'student_B', orgId: 'bennett-university' }, {
      turnId: String(assistantTurnId),
      feedback: 'down',
      category: 'unhelpful',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: student B rating student A turn returns 404', res.statusCode === 404);
  }

  // Test 4: Student A tries to submit feedback on a user-role turn -> 400
  {
    const req = createMockReq({ studentId: 'student_A', orgId: 'bennett-university' }, {
      turnId: String(userTurnId),
      feedback: 'up',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: rating user-role turn returns 400', res.statusCode === 400);
  }

  // Test 5: Non-existent turnId -> 404
  {
    const req = createMockReq({ studentId: 'student_A', orgId: 'bennett-university' }, {
      turnId: new mongoose.Types.ObjectId().toHexString(),
      feedback: 'up',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: non-existent turn returns 404', res.statusCode === 404);
  }

  // Test 6: Invalid turnId format -> 400
  {
    const req = createMockReq({ studentId: 'student_A', orgId: 'bennett-university' }, {
      turnId: 'invalid-hex-string',
      feedback: 'up',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: invalid hex turnId returns 400', res.statusCode === 400);
  }

  // Test 7: Cross-organization attempt -> 404
  {
    const req = createMockReq({ studentId: 'student_A', orgId: 'other-university' }, {
      turnId: String(assistantTurnId),
      feedback: 'up',
    });
    const res = createMockRes();
    await submitFeedback(req, res, () => {});

    check('controller: cross-org student rating returns 404', res.statusCode === 404);
  }

  // Restore mocks
  Turn.findById = origFindById;
  Conversation.findOne = origConvFindOne;

  console.log(`\nFeedback Test Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
})();
