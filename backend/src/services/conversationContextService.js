const Conversation = require('../models/Conversation');
const Turn = require('../models/Turn');

const FOLLOWUP_DOMAIN_BIAS = 0.1; // small nudge toward the last resolved domain

/**
 * Builds the extra context to send into the AI pipeline call, based on the
 * conversation's stored state. Encodes the two rules decided for this project:
 *
 *  1. If the previous turn was CLARIFY, the new message is treated as the
 *     answer to that clarification — routed against the stored candidate
 *     domains, not judged fresh on its own (a bare "semester fee" has almost
 *     no signal alone).
 *  2. Otherwise, bias toward the last resolved domain by a small amount,
 *     so one-word follow-ups ("what about hostel students") don't randomly
 *     re-route, while a genuine topic change can still override it.
 */
async function buildContext(conversation) {
  const recentTurns = await Turn.find({ conversationId: conversation.conversationId })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  const conversationHistory = recentTurns.reverse().map((t) => ({ role: t.role, text: t.text }));

  if (conversation.lastDecisionType === 'clarification' && conversation.pendingClarification?.candidateDomains?.length) {
    return {
      conversationHistory,
      mode: 'clarification_answer',
      candidateDomains: conversation.pendingClarification.candidateDomains,
      originalQuery: conversation.pendingClarification.originalQuery,
    };
  }

  if (conversation.lastResolvedDomain) {
    return {
      conversationHistory,
      mode: 'follow_up_bias',
      biasDomain: conversation.lastResolvedDomain,
      biasAmount: FOLLOWUP_DOMAIN_BIAS,
    };
  }

  return { conversationHistory, mode: 'fresh' };
}

/**
 * After the AI pipeline responds, update the conversation's rolling state
 * so the NEXT turn knows what happened on this one.
 */
// Replies that say nothing about the topic being discussed.
const NON_TOPIC_REPLIES = ['greeting', 'out_of_scope', 'personal_data_unavailable'];

async function updateConversationState(conversation, pipelineResult, originalQuery) {
  if (pipelineResult.type === 'answer' && NON_TOPIC_REPLIES.includes(pipelineResult.replyKind)) {
    // "thanks" or an off-topic question must not forget what we were
    // discussing: keep lastResolvedDomain, drop any pending clarification.
    conversation.lastDecisionType = 'answer';
    conversation.pendingClarification = undefined;
    await conversation.save();
    return conversation;
  }

  if (pipelineResult.type === 'clarification') {
    conversation.lastDecisionType = 'clarification';
    conversation.pendingClarification = {
      candidateDomains: pipelineResult.candidateDomains || [],
      originalQuery,
    };
    conversation.lastResolvedDomain = null;
  } else if (pipelineResult.type === 'answer') {
    conversation.lastDecisionType = 'answer';
    conversation.lastResolvedDomain = pipelineResult.domain || null;
    conversation.pendingClarification = undefined;
  } else if (pipelineResult.type === 'multi_answer') {
    conversation.lastDecisionType = 'multi_answer';
    // Ambiguous which single domain to bias toward next — clear it rather
    // than guessing wrong on the next turn.
    conversation.lastResolvedDomain = null;
    conversation.pendingClarification = undefined;
  } else if (pipelineResult.type === 'handoff') {
    conversation.lastDecisionType = 'handoff';
    conversation.lastResolvedDomain = null;
    conversation.pendingClarification = undefined;
  }

  await conversation.save();
  return conversation;
}

async function getOrCreateConversation({ conversationId, orgId, studentId }) {
  if (conversationId) {
    const existing = await Conversation.findOne({ conversationId });
    if (existing) {
      // A student can only continue their own conversation, inside their own
      // organization. Same 404 as
      // "not found" so ids can't be probed.
      if (existing.studentId !== studentId || existing.orgId !== orgId) {
        const err = new Error('No conversation with that id.');
        err.status = 404;
        throw err;
      }
      return existing;
    }
  }
  return Conversation.create({ orgId, studentId });
}

module.exports = { buildContext, updateConversationState, getOrCreateConversation };
