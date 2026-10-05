const Turn = require('../models/Turn');

/**
 * The domain a turn is scored as having predicted.
 * - multi_answer has no single detectedDomain. If the labeled domain is among
 *   the returned domains it counts as correct; otherwise it is scored as the
 *   highest-routingScore domain (so the confusion matrix shows what it got wrong).
 * - everything else (answer / clarification / handoff): detectedDomain, or
 *   'fallback' when there is none.
 */
function predictedDomain(turn, actual) {
  if (turn.decisionType === 'multi_answer') {
    const answers = turn.answers || [];
    if (answers.some((a) => a.domain === actual)) return actual;
    const top = [...answers].sort((a, b) => (b.routingScore || 0) - (a.routingScore || 0))[0];
    return (top && top.domain) || 'fallback';
  }
  return turn.detectedDomain || 'fallback';
}

/**
 * Routing accuracy + confusion matrix over turns that have a labeledDomain
 * set (i.e. rows from the labeled eval set that were replayed through the
 * live API, or manually labeled after the fact). Turns without a label are
 * excluded — this metric only means something against ground truth.
 */
async function computeRoutingAccuracy({ orgId } = {}) {
  const filter = { role: 'assistant', labeledDomain: { $ne: null } };
  if (orgId) filter.orgId = orgId;

  const turns = await Turn.find(filter).lean();

  if (turns.length === 0) {
    return {
      totalLabeled: 0,
      accuracy: null,
      confusionMatrix: {},
      note: 'No labeled turns yet — run the eval script against the labeled test set first.',
    };
  }

  let correct = 0;
  const confusionMatrix = {}; // { trueDomain: { predictedDomain: count } }

  for (const turn of turns) {
    const actual = turn.labeledDomain;
    const predicted = predictedDomain(turn, actual);

    if (predicted === actual) correct += 1;

    if (!confusionMatrix[actual]) confusionMatrix[actual] = {};
    confusionMatrix[actual][predicted] = (confusionMatrix[actual][predicted] || 0) + 1;
  }

  return {
    totalLabeled: turns.length,
    accuracy: Number((correct / turns.length).toFixed(4)),
    confusionMatrix,
  };
}

/**
 * End-to-end operational metrics from all logged assistant turns (labeled or not):
 * decision-type breakdown, clarify rate, containment rate (resolved without a ticket).
 */
async function computeEndToEndStats({ orgId } = {}) {
  const filter = { role: 'assistant' };
  if (orgId) filter.orgId = orgId;

  const turns = await Turn.find(filter).lean();
  const total = turns.length;
  if (total === 0) {
    return { total: 0, note: 'No assistant turns logged yet.' };
  }

  const byType = {};
  const byReplyKind = {};
  const byHandoffReason = {};
  let feedbackUp = 0;
  let feedbackDown = 0;
  let groundedAnswers = 0; // normal domain answers
  let groundedWithSources = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const turn of turns) {
    const t = turn.decisionType || 'unknown';
    byType[t] = (byType[t] || 0) + 1;
    if (turn.replyKind) byReplyKind[turn.replyKind] = (byReplyKind[turn.replyKind] || 0) + 1;
    if (turn.handoffReason) byHandoffReason[turn.handoffReason] = (byHandoffReason[turn.handoffReason] || 0) + 1;
    if (turn.decisionType === 'answer' && turn.detectedDomain && !turn.replyKind) {
      groundedAnswers += 1;
      if ((turn.answers?.[0]?.sources || []).length > 0) groundedWithSources += 1;
    }
    const latency = turn.metadata?.aiLatencyMs;
    if (typeof latency === 'number') { latencySum += latency; latencyCount += 1; }
    if (turn.feedback === 'up') feedbackUp += 1;
    if (turn.feedback === 'down') feedbackDown += 1;
  }

  const handoffCount = byType['handoff'] || 0;
  const containmentRate = Number((1 - handoffCount / total).toFixed(4));

  return {
    total,
    decisionTypeBreakdown: byType,
    replyKindBreakdown: byReplyKind,
    handoffReasonBreakdown: byHandoffReason,
    clarificationRate: Number(((byType['clarification'] || 0) / total).toFixed(4)),
    sourcesAvailableRate: groundedAnswers ? Number((groundedWithSources / groundedAnswers).toFixed(4)) : null,
    avgAiLatencyMs: latencyCount ? Math.round(latencySum / latencyCount) : null,
    containmentRate,
    feedback: { up: feedbackUp, down: feedbackDown },
  };
}

module.exports = { computeRoutingAccuracy, computeEndToEndStats };
