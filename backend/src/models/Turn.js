const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    document: String,
    section: String,
    score: Number,
    url: String, // optional, if the AI starts returning it
    chunkId: String, // optional, if the AI starts returning it
  },
  { _id: false }
);

const domainAnswerSchema = new mongoose.Schema(
  {
    domain: String,
    answer: String,
    routingScore: Number,
    routingMargin: Number,
    signals: mongoose.Schema.Types.Mixed,
    sources: { type: [sourceSchema], default: [] },
  },
  { _id: false }
);

const turnSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },

    // Populated on assistant turns — this is the routing/eval data.
    decisionType: {
      type: String,
      enum: ['answer', 'clarification', 'multi_answer', 'handoff', null],
      default: null,
    },
    detectedDomain: { type: String, default: null }, // primary domain for single-domain answers
    confidenceScore: { type: Number, default: null }, // top-1 probability (p1)
    confidenceMargin: { type: Number, default: null }, // p1 - p2 gap
    signals: { type: mongoose.Schema.Types.Mixed, default: null },
    domains: { type: [String], default: [] }, // all of OUR domains involved (1 normally, 2+ for multi_answer)
    answers: { type: [domainAnswerSchema], default: [] }, // 1 item normally, 2+ for multi_answer
    clarificationOptions: { type: [String], default: [] }, // candidate domains shown to user on CLARIFY
    candidateDomainScores: { type: mongoose.Schema.Types.Mixed, default: null },

    // Special replies that are an 'answer' on the wire but not a normal grounded one.
    replyKind: {
      type: String,
      enum: ['out_of_scope', 'greeting', 'no_answer', 'personal_data_unavailable', 'security_override', null],
      default: null,
    },
    handoffReason: { type: String, default: null },
    // Small, non-sensitive AI/request metadata (never the student's record).
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },

    // Ground-truth label, filled in later by the eval script against a labeled test set.
    // Not set during normal live traffic.
    labeledDomain: { type: String, default: null },

    // Lightweight user feedback (thumbs up/down), linked back via feedback endpoint.
    feedback: { type: String, enum: ['up', 'down', null], default: null },
    feedbackCategory: {
      type: String,
      enum: ['helpful', 'unhelpful', 'incorrect_answer', 'wrong_routing', 'missing_information', null],
      default: null,
    },
    feedbackComment: { type: String, maxlength: 500, default: null },
    feedbackAt: { type: Date, default: null },
    // Aliases matching request payload fields
    category: {
      type: String,
      enum: ['helpful', 'unhelpful', 'incorrect_answer', 'wrong_routing', 'missing_information', null],
      default: null,
    },
    comment: { type: String, maxlength: 500, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Turn', turnSchema);
