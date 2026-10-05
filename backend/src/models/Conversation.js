const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true, index: true, default: uuidv4 },
    orgId: { type: String, required: true, index: true },
    studentId: { type: String, default: 'anonymous' }, // mock/hardcoded session id, not a real user record
    lastResolvedDomain: { type: String, default: null }, // used for follow-up bias
    lastDecisionType: { type: String, default: null }, // ANSWER | CLARIFY | FALLBACK | MULTI_ANSWER
    // If the last turn was CLARIFY, we stash the candidate domains here so the
    // next message can be treated as the answer to that clarification instead
    // of a fresh, low-signal query.
    pendingClarification: {
      candidateDomains: { type: [String], default: undefined },
      originalQuery: { type: String, default: undefined },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
