const config = require('../config');
const { OUR_DOMAINS, toDomain, DEPARTMENTS } = require('../config/domains');
const messages = require('../config/messages');
const Turn = require('../models/Turn');
const Organization = require('../models/Organization');
const { callPipeline } = require('../services/aiService');
const { getStudentContext } = require('../services/studentContextService');
const { createTicket } = require('../services/ticketService');
const { isUnavailablePersonalData, detectPromptInjection } = require('../utils/guardrail');
const { isItQuestion, isClearlyItOnlyQuestion } = require('../utils/itKeywords');
const {
  buildContext,
  updateConversationState,
  getOrCreateConversation,
} = require('../services/conversationContextService');

/**
 * Decide the outcome for one message. Order matters:
 *   1. prompt-injection defense (obvious override attempts) -> fixed security reply, no AI call
 *   2. personal data we don't hold (results/marks/grades)   -> fixed reply, no AI call
 *   3. IT question (temporary keyword rule)                 -> handoff, no AI call
 *   4. everything else                                      -> AI service + normalization
 */
async function produceResult({ message, orgId, studentId, conversationId, context, requestId }) {
  const injection = detectPromptInjection(message);
  if (injection.detected) {
    console.warn(
      JSON.stringify({
        evt: 'prompt_injection_detected',
        requestId: requestId || null,
        pattern: injection.pattern,
      })
    );
    return {
      type: 'answer',
      answer: messages.SECURITY_OVERRIDE_REPLY,
      domain: null,
      routingScore: null,
      routingMargin: null,
      sources: [],
      replyKind: 'security_override',
      domains: [],
    };
  }

  if (isUnavailablePersonalData(message)) {
    return {
      type: 'answer',
      answer: messages.PERSONAL_DATA_UNAVAILABLE_REPLY,
      domain: null,
      routingScore: null,
      routingMargin: null,
      sources: [],
      replyKind: 'personal_data_unavailable',
      domains: [],
    };
  }

  if (config.itKeywordRule && isClearlyItOnlyQuestion(message)) {
    return { type: 'handoff', reason: 'it_keyword_rule', message: messages.IT_HANDOFF_REPLY, domains: ['it'] };
  }

  const [studentContext, org] = await Promise.all([
    getStudentContext(studentId), // the logged-in student's own record, by JWT identity
    Organization.findOne({ orgId }).lean(),
  ]);
  const enabledDomains = org?.enabledDomains?.length ? org.enabledDomains : OUR_DOMAINS;

  return callPipeline({
    query: message,
    conversationId,
    orgId,
    studentContext,
    enabledDomains,
    requestId,
    ...context,
  });
}

function turnTextOf(result) {
  return result.type === 'answer' || result.type === 'multi_answer' ? result.answer : result.message;
}

function toTurnDoc(result, { conversationId, orgId, requestId }) {
  const doc = {
    conversationId,
    orgId,
    role: 'assistant',
    text: turnTextOf(result),
    decisionType: result.type,
    domains: result.domains || [],
    replyKind: result.replyKind || null,
    handoffReason: result.type === 'handoff' ? result.reason : null,
    metadata: {
      requestId,
      aiLatencyMs: result.aiLatencyMs ?? null,
      aiLabel: result.aiLabel ?? null,
      aiDecision: result.aiDecision ?? null,
    },
  };

  if (result.type === 'answer') {
    doc.detectedDomain = result.domain;
    doc.confidenceScore = result.routingScore ?? null;
    doc.confidenceMargin = result.routingMargin ?? null;
    if (result.signals !== undefined) doc.signals = result.signals;
    if (result.domain) {
      doc.answers = [
        {
          domain: result.domain,
          answer: result.answer,
          routingScore: result.routingScore,
          routingMargin: result.routingMargin ?? null,
          ...(result.signals !== undefined ? { signals: result.signals } : {}),
          sources: result.sources || [],
        },
      ];
    }
  } else if (result.type === 'multi_answer') {
    doc.confidenceScore = result.routingScore ?? null;
    doc.confidenceMargin = result.routingMargin ?? null;
    if (result.signals !== undefined) doc.signals = result.signals;
    doc.answers = (result.answers || []).map((a) => ({
      domain: a.domain,
      answer: a.answer,
      routingScore: a.routingScore ?? null,
      routingMargin: a.routingMargin !== undefined ? a.routingMargin : (result.routingMargin ?? null),
      ...(a.signals !== undefined ? { signals: a.signals } : (result.signals !== undefined ? { signals: result.signals } : {})),
      sources: a.sources || [],
    }));
  } else if (result.type === 'clarification') {
    doc.clarificationOptions = result.candidateDomains || [];
    doc.confidenceScore = result.routingScore ?? null;
    doc.confidenceMargin = result.routingMargin ?? null;
    if (result.candidateDomainScores !== undefined) doc.candidateDomainScores = result.candidateDomainScores;
    else if (result.signals !== undefined) doc.candidateDomainScores = result.signals;
  }
  return doc;
}

// The frontend contract: the four types, plus replyKind on special answers.
function toClientResponse(result, { conversationId, turnId, ticketId }) {
  const base = { conversationId, turnId, type: result.type };
  switch (result.type) {
    case 'answer': {
      const dept = DEPARTMENTS[result.domain] || null;
      const resp = {
        ...base,
        answer: result.answer,
        domain: result.domain,
        domains: result.domain ? [result.domain] : (result.domains?.length ? [result.domains[0]] : []),
        department: dept,
        routedTo: dept,
        routingScore: result.routingScore ?? null,
        routingMargin: result.routingMargin ?? null,
        sources: result.sources || [],
      };
      if (result.signals !== undefined && result.signals !== null) {
        resp.signals = result.signals;
      }
      if (result.replyKind) {
        resp.replyKind = result.replyKind;
      }
      return resp;
    }
    case 'multi_answer': {
      const routedDepartments = (result.domains || []).map((d) => DEPARTMENTS[d] || d);
      const resp = {
        ...base,
        answer: result.answer,
        routingScore: result.routingScore ?? null,
        routingMargin: result.routingMargin ?? null,
        department: routedDepartments.join(' & '),
        routedTo: routedDepartments.join(' & '),
        answers: (result.answers || []).map((a) => {
          const item = {
            domain: a.domain,
            department: DEPARTMENTS[a.domain] || null,
            routedTo: DEPARTMENTS[a.domain] || null,
            answer: a.answer,
            routingScore: a.routingScore ?? null,
            routingMargin: a.routingMargin !== undefined ? a.routingMargin : (result.routingMargin ?? null),
            sources: a.sources || [],
          };
          if (a.signals !== undefined && a.signals !== null) {
            item.signals = a.signals;
          } else if (result.signals !== undefined && result.signals !== null) {
            item.signals = result.signals;
          }
          return item;
        }),
        domains: result.domains,
      };
      if (result.signals !== undefined && result.signals !== null) {
        resp.signals = result.signals;
      }
      return resp;
    }
    case 'clarification': {
      const resp = {
        ...base,
        message: result.message,
        candidateDomains: result.candidateDomains,
      };
      const candidateScores = result.candidateDomainScores ?? result.candidateScores ?? (result.signals ? Object.fromEntries(Object.entries(result.signals).filter(([k]) => result.candidateDomains?.includes(toDomain(k) || k) || result.candidateDomains?.includes(k))) : null);
      if (candidateScores !== undefined && candidateScores !== null && Object.keys(candidateScores).length > 0) {
        resp.candidateDomainScores = candidateScores;
      }
      if (result.routingScore !== undefined && result.routingScore !== null) {
        resp.routingScore = result.routingScore;
      }
      if (result.routingMargin !== undefined && result.routingMargin !== null) {
        resp.routingMargin = result.routingMargin;
      }
      return resp;
    }
    case 'handoff':
    default:
      return { ...base, reason: result.reason, message: result.message, ticketId };
  }
}

async function handleChat(req, res, next) {
  const startedAt = Date.now();
  try {
    const message = req.body.message || req.body.query;

    // req.user comes from the verified JWT -- never from the request body, so
    // a student can't ask as someone else or read another student's record.
    const orgId = req.user.orgId || config.defaultOrgId;
    const studentId = req.user.studentId;

    const conversation = await getOrCreateConversation({
      conversationId: req.body.conversationId,
      orgId,
      studentId,
    });
    const conversationId = conversation.conversationId;

    // Build context BEFORE logging the current user turn, so the history holds
    // only previous turns and the current message is sent separately as `query`.
    const context = await buildContext(conversation);

    await Turn.create({ conversationId, orgId, role: 'user', text: message });

    const result = await produceResult({
      message, orgId, studentId, conversationId, context, requestId: req.id,
    });

    await updateConversationState(conversation, result, message);

    let ticketId = null;
    if (result.type === 'handoff') {
      const ticket = await createTicket({ conversationId, orgId, query: message, reason: result.reason });
      ticketId = ticket.ticketId;
    }

    const savedTurn = await Turn.create(toTurnDoc(result, { conversationId, orgId, requestId: req.id }));

    // One structured line per chat. Deliberately NOT logged: the message text
    // and the student's record.
    console.log(
      JSON.stringify({
        evt: 'chat',
        requestId: req.id,
        conversationId,
        orgId,
        type: result.type,
        replyKind: result.replyKind || null,
        domain: result.domain || null,
        domains: result.domains || [],
        confidence: result.routingScore ?? null,
        aiLabel: result.aiLabel ?? null,
        aiDecision: result.aiDecision ?? null,
        aiLatencyMs: result.aiLatencyMs ?? null,
        handoffReason: result.type === 'handoff' ? result.reason : null,
        totalMs: Date.now() - startedAt,
      })
    );

    return res.json(toClientResponse(result, { conversationId, turnId: savedTurn._id, ticketId }));
  } catch (err) {
    next(err);
  }
}

module.exports = { handleChat, toClientResponse, produceResult };
