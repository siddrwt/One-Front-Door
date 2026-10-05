const axios = require('axios');
const config = require('../config');
const { OUR_DOMAINS, toDomain, isGreetingLabel } = require('../config/domains');
const messages = require('../config/messages');
const { mockAiRaw } = require('../mock/mockAi');

/**
 * The ONLY file that talks to the AI service. Nothing else in the backend
 * knows the AI service's URL, field names or label set.
 *
 *   Node request  ->  POST AI_SERVICE_URL (/api/v1/chat)  ->  raw AI response
 *   raw AI response  ->  normalizeAiResponse()  ->  one stable result shape
 *
 * Normalized result (what the controller and the frontend contract use):
 *
 *   { type: 'answer', answer, domain, routingScore, sources, replyKind }
 *   { type: 'multi_answer', answer, answers: [{domain, answer, routingScore, sources}] }
 *   { type: 'clarification', message, candidateDomains }
 *   { type: 'handoff', reason, message }
 *
 * `replyKind` marks answers that are not normal grounded ones:
 *   'out_of_scope' | 'greeting' | 'no_answer' | null
 *
 * Both the AI service's current response shape and the richer contract in
 * docs/AI_CONTRACT.md are accepted, so integration works before the AI team
 * has finished their side.
 */

class AiContractError extends Error {}

const KNOWN_DECISIONS = ['answer', 'multi_answer', 'clarification', 'greeting', 'out_of_scope', 'no_answer', 'handoff'];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const uniq = (arr) => [...new Set(arr)];

function normalizeSources(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => {
      if (typeof s === 'string') return { document: s };
      if (!s || typeof s !== 'object') return null;
      return {
        document: s.document ?? s.title ?? s.source ?? s.name ?? null,
        section: s.section ?? null,
        score: num(s.score),
        url: s.url ?? undefined,
        chunkId: s.chunk_id ?? s.chunkId ?? undefined,
      };
    })
    .filter(Boolean);
}

// All the (label, score) pairs the AI reported, if it reported any.
function scoreList(raw) {
  const out = [];
  if (raw.domain_scores && typeof raw.domain_scores === 'object' && !Array.isArray(raw.domain_scores)) {
    for (const [label, score] of Object.entries(raw.domain_scores)) out.push({ label, score: num(score) });
  } else if (Array.isArray(raw.domains)) {
    for (const d of raw.domains) {
      if (typeof d === 'string') out.push({ label: d, score: null });
      else if (d && typeof d === 'object') out.push({ label: d.domain ?? d.label, score: num(d.confidence ?? d.score) });
    }
  }
  return out.filter((x) => x.label);
}

function computeMargin(raw, scores) {
  const explicit = num(raw.margin) ?? num(raw.routing_margin) ?? num(raw.routingMargin);
  if (explicit !== null) return explicit;
  const nums = scores.map((s) => s.score).filter((v) => v !== null).sort((a, b) => b - a);
  return nums.length >= 2 ? Number((nums[0] - nums[1]).toFixed(4)) : null;
}

function answerResult({ answer, domain = null, routingScore = null, margin = null, sources = [], replyKind = null, domains, aiLabel = null, aiDecision = null, signals = null }) {
  return {
    type: 'answer',
    answer,
    domain,
    routingScore,
    routingMargin: margin,
    ...(signals !== null && signals !== undefined ? { signals } : {}),
    sources,
    replyKind,
    domains: domains ?? (domain ? [domain] : []),
    aiLabel,
    aiDecision,
  };
}

/**
 * Pure function: raw AI response -> normalized result. Throws AiContractError
 * if the response can't be understood at all.
 */
function normalizeAiResponse(raw, { enabledDomains = OUR_DOMAINS, requireSources = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AiContractError('AI response is not a JSON object');
  }

  const enabled = new Set(enabledDomains.filter((d) => OUR_DOMAINS.includes(d)));
  const usable = (d) => d && enabled.has(d);

  const aiLabel = str(raw.domain);
  const answerText = str(raw.answer) ?? str(raw.response);
  const hasParts = Array.isArray(raw.answers) && raw.answers.length > 0;
  const routingScore = num(raw.confidence) ?? num(raw.routing_score) ?? num(raw.routingScore);
  const usedContext = raw.used_student_context === true;
  const sources = normalizeSources(raw.sources);
  const scores = scoreList(raw);
  const margin = computeMargin(raw, scores);
  const signals =
    raw.signals && typeof raw.signals === 'object' && !Array.isArray(raw.signals)
      ? raw.signals
      : raw.domain_scores && typeof raw.domain_scores === 'object' && !Array.isArray(raw.domain_scores)
      ? raw.domain_scores
      : scores.length
      ? Object.fromEntries(scores.map((s) => [s.label, s.score]))
      : null;

  // ---- decide what the AI is telling us -------------------------------------
  let decision = str(raw.decision)?.toLowerCase() ?? null;
  if (decision && !KNOWN_DECISIONS.includes(decision)) {
    throw new AiContractError(`unknown decision "${raw.decision}"`);
  }
  if (!decision) {
    // Legacy shape (no explicit decision): fall back to the flags it does send.
    if (raw.needs_clarification === true) decision = 'clarification';
    else if (hasParts) decision = 'multi_answer';
    else if (answerText) decision = 'answer';
    else throw new AiContractError('AI response has no decision, answer or answers');
  }

  const meta = { aiLabel, aiDecision: decision };
  const outOfScope = () =>
    answerResult({ answer: messages.OUT_OF_SCOPE_REPLY, replyKind: 'out_of_scope', domains: [], signals, ...meta });
  const noAnswer = (domain) =>
    answerResult({
      answer: messages.noAnswerReply(domain), domain, routingScore, margin, sources: [],
      replyKind: 'no_answer', signals, ...meta,
    });
  const domainsOf = (primary) => {
    const fromList = uniq(scores.map((s) => toDomain(s.label)).filter(usable));
    return fromList.length ? fromList : primary ? [primary] : [];
  };

  switch (decision) {
    case 'handoff':
      return {
        type: 'handoff',
        reason: str(raw.handoff_reason) ?? 'ai_requested',
        message: str(raw.message) ?? messages.HANDOFF_GENERIC_REPLY,
        domains: [], ...meta,
      };

    case 'greeting':
      return answerResult({ answer: answerText ?? messages.GREETING_REPLY, replyKind: 'greeting', domains: [], signals, ...meta });

    case 'out_of_scope':
      return outOfScope();

    case 'no_answer': {
      const d = toDomain(aiLabel);
      return usable(d) ? noAnswer(d) : outOfScope();
    }

    case 'clarification': {
      const rawOptions = raw.clarification_options ?? raw.candidate_domains ?? raw.candidateDomains ?? [];
      const options = uniq((Array.isArray(rawOptions) ? rawOptions : []).map(toDomain).filter(usable));
      if (options.length >= 2) {
        const candidateScores = raw.candidate_domain_scores ?? raw.candidateDomainScores ?? (signals ? Object.fromEntries(Object.entries(signals).filter(([k]) => options.includes(toDomain(k) || k))) : null);
        return {
          type: 'clarification',
          message: str(raw.message) ?? messages.clarificationQuestion(options),
          candidateDomains: options,
          ...(candidateScores && Object.keys(candidateScores).length ? { candidateDomainScores: candidateScores } : {}),
          ...(routingScore !== null ? { routingScore } : {}),
          ...(margin !== null ? { routingMargin: margin } : {}),
          ...(signals ? { signals } : {}),
          domains: options, ...meta,
        };
      }
      // Fewer than two of OUR domains left, so there is nothing to choose between.
      if (options.length === 1) {
        const explicit = str(raw.answer);
        return explicit
          ? answerResult({ answer: explicit, domain: options[0], routingScore, margin, sources, signals, ...meta })
          : noAnswer(options[0]);
      }
      return outOfScope();
    }

    case 'multi_answer': {
      if (!hasParts) throw new AiContractError('multi_answer response has no answers[]');
      const parts = [];
      raw.answers.forEach((part, i) => {
        if (!part || typeof part !== 'object') throw new AiContractError(`answers[${i}] is not an object`);
        const d = toDomain(part.domain ?? part.label);
        if (!usable(d)) return; // a part outside our domains is dropped
        const partSources = normalizeSources(part.sources);
        const partScore = num(part.confidence) ?? num(part.routing_score) ?? num(part.routingScore);
        const partMargin = num(part.routing_margin) ?? num(part.routingMargin) ?? num(part.margin);
        const partSignals =
          part.signals && typeof part.signals === 'object' && !Array.isArray(part.signals)
            ? part.signals
            : part.domain_scores && typeof part.domain_scores === 'object' && !Array.isArray(part.domain_scores)
            ? part.domain_scores
            : null;
        const rawPartText = str(part.answer) ?? str(part.response);
        if (!rawPartText && !part.no_answer) throw new AiContractError(`answers[${i}] has no answer text`);
        const partNoAnswer = part.no_answer === true || (requireSources && partSources.length === 0 && part.used_student_context !== true);
        const text = partNoAnswer ? messages.noAnswerReply(d) : rawPartText;
        const existing = parts.find((p) => p.domain === d);
        if (existing) {
          // Two AI labels can map to one of our domains (e.g. Facilities + Housing).
          existing.answer += `\n${text}`;
          existing.sources = [...existing.sources, ...partSources];
          existing.routingScore = Math.max(existing.routingScore ?? 0, partScore ?? 0) || null;
          existing.noAnswer = existing.noAnswer && partNoAnswer;
        } else {
          parts.push({ domain: d, answer: text, routingScore: partScore, routingMargin: partMargin, signals: partSignals, sources: partSources, noAnswer: partNoAnswer });
        }
      });

      if (parts.length === 0) return outOfScope();
      if (parts.length === 1) {
        const p = parts[0];
        return answerResult({
          answer: p.answer, domain: p.domain, routingScore: p.routingScore, margin, sources: p.sources, signals,
          replyKind: p.noAnswer ? 'no_answer' : null, ...meta,
        });
      }
      const top = Math.max(...parts.map((p) => p.routingScore ?? 0)) || null;
      return {
        type: 'multi_answer',
        // One answer, each domain's part on its own line (decision 14).
        answer: parts.map((p) => p.answer).join('\n\n'),
        answers: parts.map(({ domain, answer, routingScore: rs, sources: src, routingMargin: rm, signals: sig }) => ({
          domain,
          answer,
          routingScore: rs,
          ...(rm !== undefined ? { routingMargin: rm } : margin !== null ? { routingMargin: margin } : {}),
          ...(sig !== undefined ? { signals: sig } : signals ? { signals } : {}),
          sources: src,
        })),
        domains: parts.map((p) => p.domain),
        routingScore: top,
        routingMargin: margin,
        ...(signals ? { signals } : {}),
        ...meta,
      };
    }

    case 'answer':
    default: {
      // Greetings / thanks: the classifier's catch-all label.
      if (isGreetingLabel(aiLabel) && !usedContext) {
        return answerResult({ answer: messages.GREETING_REPLY, replyKind: 'greeting', domains: [], signals, ...meta });
      }
      const mapped = toDomain(aiLabel);
      const domain = usable(mapped) ? mapped : null;

      if (!domain) {
        // Personal questions can be answered from the student's own record even
        // when the AI labels them with something outside our five domains
        // (e.g. "which semester am I in" -> Registration).
        if (usedContext && answerText) return answerResult({ answer: answerText, routingScore, margin, sources, signals, ...meta });
        return outOfScope();
      }

      if (!answerText && !raw.no_answer) throw new AiContractError('AI response has no answer text');
      const nothingFound = raw.no_answer === true || (requireSources && sources.length === 0 && !usedContext);
      if (nothingFound) return noAnswer(domain);

      return answerResult({
        answer: answerText, domain, routingScore, margin, sources, domains: domainsOf(domain), signals, ...meta,
      });
    }
  }
}

function buildRequest({
  query,
  conversationId,
  orgId,
  studentContext = null,
  conversationHistory = [],
  mode = 'fresh',
  candidateDomains = null,
  originalQuery = null,
  biasDomain = null,
  biasAmount = null,
}) {
  return {
    query,
    conversation_id: conversationId ?? null,
    org_id: orgId,
    student_context: studentContext,
    conversation_history: conversationHistory,
    mode,
    candidate_domains: candidateDomains,
    original_query: originalQuery,
    bias_domain: biasDomain,
    bias_amount: biasAmount,
  };
}

function classifyFailure(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return 'ai_timeout';
  if (err.response) return 'ai_http_error';
  return 'ai_unavailable';
}

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableError(err) {
  if (err.response) {
    const status = err.response.status;
    // Permanent client errors must NOT be retried
    if (status >= 400 && status < 500) return false;
    // Temporary server errors (cold starts, bad gateway, gateway timeouts)
    return status === 502 || status === 503 || status === 504;
  }
  // Network and timeout errors (no response received)
  if (
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ECONNRESET' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'EAI_AGAIN' ||
    err.code === 'ERR_NETWORK'
  ) {
    return true;
  }
  if (!err.response && err.request) {
    return true;
  }
  return false;
}

async function fetchRaw(body, requestId) {
  if (config.useMockAi) return mockAiRaw(body);
  const headers = {
    ...(requestId ? { 'X-Request-Id': requestId } : {}),
    ...(config.aiServiceApiKey ? { Authorization: `Bearer ${config.aiServiceApiKey}` } : {}),
  };

  const isHfInference = /huggingface\.co/.test(config.aiServiceUrl);
  const payload = isHfInference ? { inputs: body.query } : body;

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(config.aiServiceUrl, payload, {
        timeout: config.aiServiceTimeoutMs,
        headers,
      });

      const data = response.data;
      // If Hugging Face serverless inference returns classification array: [[{ label, score }]]
      if (Array.isArray(data)) {
        const list = Array.isArray(data[0]) ? data[0] : data;
        if (list.length && list[0].label && typeof list[0].score === 'number') {
          const sorted = [...list].sort((a, b) => b.score - a.score);
          const top = sorted[0];
          const domainScores = Object.fromEntries(sorted.map((s) => [s.label, s.score]));
          return {
            domain: top.label,
            confidence: top.score,
            response: `The query is categorized under ${top.label} with confidence ${(top.score * 100).toFixed(1)}%.`,
            domain_scores: domainScores,
            domains: sorted.filter((s) => s.score >= 0.2).map((s) => ({ domain: s.label, confidence: s.score })),
          };
        }
      }

      return data;
    } catch (err) {
      lastError = err;
      const canRetry = attempt < MAX_RETRIES && isRetryableError(err);
      if (!canRetry) {
        throw err;
      }
      const retryCount = attempt + 1;
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        JSON.stringify({
          evt: 'ai_retry',
          requestId: requestId || null,
          attempt: retryCount,
          maxRetries: MAX_RETRIES,
          delayMs,
          status: err.response?.status || null,
          code: err.code || null,
          reason: classifyFailure(err),
        })
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Calls the AI service and returns a normalized result. NEVER throws for AI
 * problems: timeouts, network errors, non-2xx and malformed responses all come
 * back as a 'handoff' result, so the request still ends with a controlled
 * reply and a ticket.
 */
async function callPipeline(params) {
  const started = Date.now();
  const failure = (reason, detail) => {
    console.error(`[aiService] ${reason}: ${detail}`);
    return {
      type: 'handoff', reason, message: messages.AI_FAILURE_REPLY, domains: [],
      aiLatencyMs: Date.now() - started,
    };
  };

  let raw;
  try {
    raw = await fetchRaw(buildRequest(params), params.requestId);
  } catch (err) {
    return failure(classifyFailure(err), err.message);
  }

  try {
    const result = normalizeAiResponse(raw, {
      enabledDomains: params.enabledDomains,
      requireSources: config.requireSources,
    });
    return { ...result, aiLatencyMs: Date.now() - started };
  } catch (err) {
    if (err instanceof AiContractError) return failure('ai_malformed_response', err.message);
    throw err;
  }
}

module.exports = { callPipeline, normalizeAiResponse, buildRequest, AiContractError };
