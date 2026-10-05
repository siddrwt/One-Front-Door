/**
 * scripts/runEval.js
 *
 * Offline evaluation runner for the campus-assistant backend.
 *
 * Connects to the real MongoDB (same MONGO_URI as the server), sends every
 * case in test/evalDataset.json through the full produceResult pipeline using
 * the mock AI, records predictions, and prints a structured report.
 *
 * Eval data is written under a dedicated orgId (eval-run-<timestamp>) so it
 * stays isolated from student data. All eval records (org, conversations,
 * turns, tickets) are deleted from the DB when the run finishes.
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --output reports/eval_2026-10-05.json
 *   npm run eval -- --dataset test/evalDataset.json --output reports/latest.json
 *   npm run eval -- --no-cleanup    # keep eval records in DB for inspection
 */

'use strict';

require('dotenv').config();
process.env.USE_MOCK_AI = 'true';
process.env.REQUIRE_SOURCES = 'true';
process.env.NODE_ENV = 'development'; // keep dotenv loading the .env file
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const DATASET_PATH = getArg('--dataset') || 'test/evalDataset.json';
const OUTPUT_PATH  = getArg('--output')  || null;
const VERBOSE      = args.includes('--verbose');
const NO_CLEANUP   = args.includes('--no-cleanup');

// ─── imports ─────────────────────────────────────────────────────────────────
const path     = require('path');
const fs       = require('fs');
const mongoose = require('mongoose');
const connectDB    = require('../src/config/db');
const config       = require('../src/config');
const Organization = require('../src/models/Organization');
const Turn         = require('../src/models/Turn');
const Conversation = require('../src/models/Conversation');
const Ticket       = require('../src/models/Ticket');

config.useMockAi     = true;
config.requireSources = true;
config.itKeywordRule  = true;

const { produceResult } = require('../src/controllers/chatController');
const { buildContext, getOrCreateConversation, updateConversationState } =
  require('../src/services/conversationContextService');

// Unique orgId for this eval run — keeps eval data separate from student data.
const EVAL_ORG_ID = `eval-run-${Date.now()}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const green = (s) => GREEN + s + RESET;
const red = (s) => RED + s + RESET;
const yellow = (s) => YELLOW + s + RESET;
const cyan = (s) => CYAN + s + RESET;
const bold = (s) => BOLD + s + RESET;
const dim = (s) => DIM + s + RESET;

const pct = (n, d) => (d === 0 ? 'N/A' : ((n / d) * 100).toFixed(1) + '%');

// Normalise a raw domain string to our canonical ids (or null).
const { toDomain, OUR_DOMAINS } = require('../src/config/domains');
const normDomain = (d) => {
  if (!d) return null;
  const mapped = toDomain(d);
  return mapped || null;
};

// Ground-truth domain policy documents
const DOMAIN_DOCUMENTS = {
  fees: ['fee_policy.pdf'],
  examination: ['exam_regulations.pdf'],
  facilities: ['facilities_handbook.pdf', 'hostel_policy.pdf'],
  career_services: ['placement_guide.pdf'],
  it: ['it_policy.pdf'],
  registration: ['registration_guide.pdf'],
};

function normalizeDocName(docStr) {
  if (!docStr || typeof docStr !== 'string') return '';
  return path.basename(docStr.trim().toLowerCase());
}

/**
 * Returns expected ground-truth policy documents for a test case.
 * Uses explicit expectedDocument / expectedDocuments if present, otherwise maps from expected domain(s).
 */
function getExpectedDocuments(tc) {
  if (tc.expectedDocument) {
    return [normalizeDocName(tc.expectedDocument)];
  }
  if (Array.isArray(tc.expectedDocuments) && tc.expectedDocuments.length > 0) {
    return tc.expectedDocuments.map(normalizeDocName);
  }
  const domains = [];
  if (tc.expectedDomain) domains.push(tc.expectedDomain);
  if (Array.isArray(tc.expectedDomains)) domains.push(...tc.expectedDomains);

  const docs = new Set();
  for (const d of domains) {
    const canonical = normDomain(d);
    const domainDocs = DOMAIN_DOCUMENTS[canonical];
    if (domainDocs) {
      domainDocs.forEach((doc) => docs.add(normalizeDocName(doc)));
    }
  }
  return [...docs];
}

/**
 * Extract all sources attached to a result (single answer or multi-answer).
 */
function extractCitedSources(result) {
  if (!result) return [];
  if (result.type === 'answer') {
    return Array.isArray(result.sources) ? result.sources : [];
  }
  if (result.type === 'multi_answer') {
    const list = [];
    for (const ans of (result.answers || [])) {
      if (Array.isArray(ans.sources)) {
        list.push(...ans.sources);
      }
    }
    return list;
  }
  return [];
}

/**
 * Derive a single "predicted decision" string from the result object that
 * matches the vocabulary used in expectedDecision fields of the dataset.
 *
 *  result.type           replyKind / reason           → decision label
 *  'answer'              null / normal                 → 'answer'
 *  'answer'              'no_answer'                   → 'no_answer'
 *  'answer'              'out_of_scope'                → 'out_of_scope'
 *  'answer'              'greeting'                    → 'greeting'
 *  'answer'              'personal_data_unavailable'   → 'personal_data_unavailable'
 *  'multi_answer'        any                           → 'multi_answer'
 *  'clarification'       any                           → 'clarification'
 *  'handoff'             'it_keyword_rule'             → 'handoff'  (IT handoff)
 *  'handoff'             anything else                 → 'handoff'
 */
function predictedDecision(result) {
  if (!result) return 'error';
  if (result.type === 'multi_answer') return 'multi_answer';
  if (result.type === 'clarification') return 'clarification';
  if (result.type === 'handoff') return 'handoff';
  if (result.type === 'answer') {
    const rk = result.replyKind || null;
    if (rk === 'no_answer') return 'no_answer';
    if (rk === 'out_of_scope') return 'out_of_scope';
    if (rk === 'greeting') return 'greeting';
    if (rk === 'personal_data_unavailable') return 'personal_data_unavailable';
    if (rk === 'security_override') return 'security_override';
    return 'answer';
  }
  return result.type || 'unknown';
}

/**
 * Evaluate whether a single result is "correct" by the dataset expectation.
 *
 * Correctness rules (applied in order):
 *  1. personal_data_unavailable expected → must be personal_data_unavailable reply
 *  2. handoff expected → must be handoff type
 *  3. greeting expected → must be greeting replyKind
 *  4. out_of_scope expected → must be out_of_scope replyKind
 *  5. no_answer expected → must be no_answer replyKind with matching domain
 *  6. clarification expected (ambiguous case) → clarification OR out_of_scope are both ok
 *  7. multi_answer expected → must be multi_answer; all expectedDomains must appear
 *  8. answer expected with domain → must be answer with the expected domain
 *  9. answer expected, domain null → any answer-type result is ok
 */
function isCorrect(tc, result, predicted) {
  const exp = tc.expectedDecision;

  if (exp === 'personal_data_unavailable') {
    return predicted === 'personal_data_unavailable';
  }
  if (exp === 'handoff') {
    return predicted === 'handoff';
  }
  if (exp === 'greeting') {
    return predicted === 'greeting';
  }
  if (exp === 'out_of_scope') {
    return predicted === 'out_of_scope';
  }
  if (exp === 'no_answer') {
    if (predicted !== 'no_answer') return false;
    if (tc.expectedDomain) return normDomain(result.domain) === tc.expectedDomain;
    return true;
  }
  if (exp === 'clarification') {
    // Ambiguous case: clarification or out_of_scope are both acceptable outcomes.
    return predicted === 'clarification' || predicted === 'out_of_scope';
  }
  if (exp === 'multi_answer') {
    if (predicted !== 'multi_answer') return false;
    if (!tc.expectedDomains) return true;
    const predicted_domains = new Set((result.answers || []).map((a) => normDomain(a.domain)).filter(Boolean));
    return tc.expectedDomains.every((d) => predicted_domains.has(d));
  }
  if (exp === 'answer') {
    if (predicted !== 'answer') return false;
    if (tc.expectedDomain) return normDomain(result.domain) === tc.expectedDomain;
    return true;
  }
  return false;
}

/**
 * Classify a wrong result more specifically for the confusion analysis.
 *
 * Returns one of:
 *  'wrong_confident_route'  — got answer but wrong domain (and expected answer)
 *  'missed_multi_domain'    — expected multi but got single answer
 *  'wrong_clarification'    — clarified an easy query (easy category)
 *  'spurious_handoff'       — handed off when a domain answer was expected
 *  'missed_handoff'         — answered when handoff was expected
 *  'wrong_type'             — generic type mismatch
 */
function classifyError(tc, result, predicted) {
  const exp = tc.expectedDecision;
  if (exp === 'answer' && predicted === 'answer' && tc.expectedDomain) {
    return 'wrong_confident_route';
  }
  if (exp === 'multi_answer' && predicted === 'answer') {
    return 'missed_multi_domain';
  }
  if (exp === 'answer' && predicted === 'clarification' && tc.category === 'easy') {
    return 'wrong_clarification';
  }
  if (exp !== 'handoff' && predicted === 'handoff') {
    return 'spurious_handoff';
  }
  if (exp === 'handoff' && predicted !== 'handoff') {
    return 'missed_handoff';
  }
  return 'wrong_type';
}

// ─── Confusion matrix cell key: "expected→predicted" ─────────────────────────
function confKey(exp, pred) {
  return `${exp} → ${pred}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const startedAt = Date.now();

  // Silence normal controller logging during eval
  const _log = console.log;
  console.log = (...a) => {
    if (VERBOSE) _log(...a);
  };

  // ── Connect to real MongoDB ────────────────────────────────────────────────
  try {
    await connectDB();
    _log(dim(`  [eval] connected to MongoDB`));
  } catch (err) {
    _log(red(`[eval] MongoDB connection failed: ${err.message}`));
    process.exit(1);
  }

  // ── Seed an isolated eval organisation ───────────────────────────────────
  const { OUR_DOMAINS: evalDomains } = require('../src/config/domains');
  await Organization.findOneAndUpdate(
    { orgId: EVAL_ORG_ID },
    { orgId: EVAL_ORG_ID, name: 'Eval Run (auto-cleanup)', enabledDomains: evalDomains },
    { upsert: true, new: true }
  );

  // Load dataset
  const datasetAbsPath = path.resolve(__dirname, '..', DATASET_PATH);
  if (!fs.existsSync(datasetAbsPath)) {
    console.error = (...a) => _log(...a);
    console.error(red(`Dataset not found: ${datasetAbsPath}`));
    await mongoose.disconnect();
    process.exit(1);
  }
  let dataset;
  try {
    dataset = JSON.parse(fs.readFileSync(datasetAbsPath, 'utf8'));
  } catch (e) {
    _log(red(`Failed to parse dataset: ${e.message}`));
    await mongoose.disconnect();
    process.exit(1);
  }
  if (!Array.isArray(dataset) || dataset.length === 0) {
    _log(red('Dataset must be a non-empty JSON array'));
    await mongoose.disconnect();
    process.exit(1);
  }

  _log(bold(`\n${'═'.repeat(70)}`));
  _log(bold(` CAMPUS ASSISTANT — OFFLINE EVALUATION RUNNER`));
  _log(bold(`${'═'.repeat(70)}`));
  _log(dim(` Dataset : ${datasetAbsPath}`));
  _log(dim(` Cases   : ${dataset.length}`));
  _log(dim(` AI mode : mock (deterministic)`));
  _log(dim(` Date    : ${new Date().toISOString()}`));
  _log('');

  // ── Run each case ────────────────────────────────────────────────────────
  const results = [];
  const allCategories = new Set();
  const allDecisions = new Set();
  const confusionMatrix = {};

  for (const tc of dataset) {
    allCategories.add(tc.category);

    const conv = await getOrCreateConversation({
      conversationId: null,
      orgId: EVAL_ORG_ID,
      studentId: 'eval-user',
    });

    const context = await buildContext(conv);
    const t0 = Date.now();

    let result;
    try {
      result = await produceResult({
        message: tc.query,
        orgId: EVAL_ORG_ID,
        studentId: 'eval-user',
        conversationId: conv.conversationId,
        context,
        requestId: tc.id,
      });
      await updateConversationState(conv, result, tc.query);
    } catch (err) {
      result = { type: 'error', error: err.message };
    }

    const latencyMs = Date.now() - t0;
    const pred = predictedDecision(result);
    const correct = isCorrect(tc, result, pred);
    const errorClass = correct ? null : classifyError(tc, result, pred);

    const predictedDomain =
      result.type === 'answer'
        ? normDomain(result.domain)
        : result.type === 'multi_answer'
        ? (result.answers || []).map((a) => normDomain(a.domain)).filter(Boolean)
        : null;

    const citedSources = extractCitedSources(result);
    const expectedDocs = getExpectedDocuments(tc);

    const hasSources =
      result.type === 'answer'
        ? Array.isArray(result.sources) && result.sources.length > 0
        : result.type === 'multi_answer'
        ? (result.answers || []).some((a) => Array.isArray(a.sources) && a.sources.length > 0)
        : false;

    // Check if the AI service provided candidate retrieval chunks prior to generation
    const candidateChunks =
      result.retrieved_chunks ||
      result.retrievedChunks ||
      result.retrieval_metadata?.chunks ||
      null;

    let citationPrecision = null;
    let citationRecallAt1 = null;
    let citationRecallAt3 = null;
    let relevantCitedCount = 0;
    const evaluatedSources = [];

    const isPolicyAnswerCase =
      (tc.expectedDecision === 'answer' || tc.expectedDecision === 'multi_answer') &&
      expectedDocs.length > 0;

    if (citedSources.length > 0) {
      for (const s of citedSources) {
        const docName = normalizeDocName(s.document || s.title || s.source || s.name);
        const isRelevant = expectedDocs.includes(docName);
        if (isRelevant) relevantCitedCount++;
        evaluatedSources.push({
          document: s.document || s.title || s.source || null,
          section: s.section || null,
          score: s.score ?? null,
          chunkId: s.chunkId || s.chunk_id || null,
          isRelevant,
        });
      }
      citationPrecision = evaluatedSources.length > 0
        ? Number((relevantCitedCount / evaluatedSources.length).toFixed(4))
        : null;

      const top1 = evaluatedSources.slice(0, 1);
      const top3 = evaluatedSources.slice(0, 3);
      citationRecallAt1 = top1.some((s) => s.isRelevant) ? 1 : 0;
      citationRecallAt3 = top3.some((s) => s.isRelevant) ? 1 : 0;
    } else if (isPolicyAnswerCase && result.type === 'answer' && !result.used_student_context) {
      citationRecallAt1 = 0;
      citationRecallAt3 = 0;
    }

    // Retrieval Recall@K (pre-generation retrieval candidate pool)
    let retrievalRecallAt1 = null;
    let retrievalRecallAt3 = null;
    let retrievalRecallAt5 = null;
    const retrievalCandidateCount = Array.isArray(candidateChunks) ? candidateChunks.length : 0;

    if (retrievalCandidateCount > 0 && expectedDocs.length > 0) {
      const isChunkRelevant = (c) => expectedDocs.includes(normalizeDocName(c.document || c.title || c.source));
      retrievalRecallAt1 = candidateChunks.slice(0, 1).some(isChunkRelevant) ? 1 : 0;
      retrievalRecallAt3 = candidateChunks.slice(0, 3).some(isChunkRelevant) ? 1 : 0;
      retrievalRecallAt5 = candidateChunks.slice(0, 5).some(isChunkRelevant) ? 1 : 0;
    }

    const row = {
      id: tc.id,
      query: tc.query,
      category: tc.category,
      expectedDecision: tc.expectedDecision,
      expectedDomain: tc.expectedDomain || tc.expectedDomains || null,
      expectedDocuments: expectedDocs,
      predictedDecision: pred,
      predictedDomain,
      routingScore: result.routingScore ?? null,
      routingMargin: result.routingMargin ?? null,
      hasSources,
      citedSources: evaluatedSources,
      relevantCitedCount,
      citationPrecision,
      citationRecallAt1,
      citationRecallAt3,
      retrievalCandidateCount,
      retrievalRecallAt1,
      retrievalRecallAt3,
      retrievalRecallAt5,
      latencyMs,
      correct,
      errorClass,
      notes: tc.notes || null,
    };

    results.push(row);
    allDecisions.add(tc.expectedDecision);

    // Confusion matrix
    const ck = confKey(tc.expectedDecision, pred);
    confusionMatrix[ck] = (confusionMatrix[ck] || 0) + 1;

    // Per-row verbose output
    const icon = correct ? green('✔') : red('✘');
    const detail = correct
      ? dim(`${pred}`)
      : red(`expected ${tc.expectedDecision}, got ${pred}`) + (errorClass ? yellow(` [${errorClass}]`) : '');
    if (VERBOSE) {
      _log(`  ${icon} ${dim(tc.id.padEnd(14))} ${tc.query.slice(0, 55).padEnd(58)} ${detail}`);
    }
  }

  console.log = _log; // restore

  // ── Aggregate metrics ────────────────────────────────────────────────────
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const wrong = total - correct;
  const accuracy = correct / total;

  const handoffTotal = results.filter((r) => r.expectedDecision === 'handoff').length;
  const handoffCorrect = results.filter((r) => r.expectedDecision === 'handoff' && r.correct).length;

  const clarTotal = results.filter((r) => r.expectedDecision === 'clarification').length;
  const clarCorrect = results.filter((r) => r.expectedDecision === 'clarification' && r.correct).length;

  const wrongConfidentRoute = results.filter((r) => r.errorClass === 'wrong_confident_route').length;
  const missedMulti = results.filter((r) => r.errorClass === 'missed_multi_domain').length;
  const wrongClarification = results.filter((r) => r.errorClass === 'wrong_clarification').length;
  const spuriousHandoff = results.filter((r) => r.errorClass === 'spurious_handoff').length;
  const missedHandoff = results.filter((r) => r.errorClass === 'missed_handoff').length;
  const wrongType = results.filter((r) => r.errorClass === 'wrong_type').length;

  const multiTotal = results.filter((r) => r.expectedDecision === 'multi_answer').length;
  const multiCorrect = results.filter((r) => r.expectedDecision === 'multi_answer' && r.correct).length;

  // Per category
  const byCategory = {};
  for (const cat of allCategories) {
    const catRows = results.filter((r) => r.category === cat);
    byCategory[cat] = {
      total: catRows.length,
      correct: catRows.filter((r) => r.correct).length,
      wrong: catRows.filter((r) => !r.correct).length,
    };
  }

  // Per expected decision type
  const byDecision = {};
  for (const d of allDecisions) {
    const rows = results.filter((r) => r.expectedDecision === d);
    byDecision[d] = {
      total: rows.length,
      correct: rows.filter((r) => r.correct).length,
    };
  }

  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / total;
  const sourcedAnswers = results.filter((r) => r.predictedDecision === 'answer' && r.hasSources).length;
  const totalAnswers = results.filter((r) => r.predictedDecision === 'answer').length;

  // ── Retrieval and Citation Metrics ───────────────────────────────────────
  const policyAnswerRows = results.filter(
    (r) => (r.expectedDecision === 'answer' || r.expectedDecision === 'multi_answer') && r.expectedDocuments.length > 0
  );
  const sourcedRows = results.filter((r) => r.citedSources.length > 0);
  const totalCitations = sourcedRows.reduce((acc, r) => acc + r.citedSources.length, 0);
  const totalRelevantCitations = sourcedRows.reduce(
    (acc, r) => acc + r.citedSources.filter((s) => s.isRelevant).length,
    0
  );
  const totalIrrelevantCitations = totalCitations - totalRelevantCitations;

  const microCitationPrecision = totalCitations > 0 ? totalRelevantCitations / totalCitations : null;
  const macroCitationPrecision =
    sourcedRows.length > 0
      ? sourcedRows.reduce((acc, r) => acc + (r.citationPrecision ?? 0), 0) / sourcedRows.length
      : null;

  const policyCasesCount = policyAnswerRows.length;
  const policyCasesWithRecall1 = policyAnswerRows.filter((r) => r.citationRecallAt1 === 1).length;
  const policyCasesWithRecall3 = policyAnswerRows.filter((r) => r.citationRecallAt3 === 1).length;

  const citationRecallAt1Rate = policyCasesCount > 0 ? policyCasesWithRecall1 / policyCasesCount : null;
  const citationRecallAt3Rate = policyCasesCount > 0 ? policyCasesWithRecall3 / policyCasesCount : null;

  // Pre-generation Retrieval Recall@K (candidate pool) check
  const candidatePoolExposed = results.some((r) => r.retrievalCandidateCount > 0);
  const retrievalRecallStatus = candidatePoolExposed ? 'implemented' : 'impossible_with_current_contract';

  // ── Print report ─────────────────────────────────────────────────────────
  const LINE = '─'.repeat(70);
  console.log(bold(`\n${'═'.repeat(70)}`));
  console.log(bold(' SUMMARY'));
  console.log(bold(`${'═'.repeat(70)}`));
  console.log(`  Total cases     : ${total}`);
  console.log(`  Correct         : ${green(correct)} / ${total}   (${green(pct(correct, total))})`);
  console.log(`  Wrong           : ${wrong > 0 ? red(wrong) : wrong}`);
  console.log(`  Routing Accuracy: ${accuracy >= 0.8 ? green(pct(correct, total)) : accuracy >= 0.6 ? yellow(pct(correct, total)) : red(pct(correct, total))}`);
  console.log(`  Avg latency     : ${avgLatency.toFixed(0)} ms`);
  console.log(`  Sources present : ${pct(sourcedAnswers, totalAnswers)} of answered responses`);

  console.log(`\n${bold(' RETRIEVAL & CITATION EVALUATION')}`);
  console.log(LINE);
  console.log(
    `  Citation Precision (Micro)  : ${microCitationPrecision !== null ? green((microCitationPrecision * 100).toFixed(1) + '%') : 'N/A'}` +
    `  (${totalRelevantCitations}/${totalCitations} cited sources relevant)`
  );
  console.log(
    `  Citation Precision (Macro)  : ${macroCitationPrecision !== null ? green((macroCitationPrecision * 100).toFixed(1) + '%') : 'N/A'}` +
    `  (avg across ${sourcedRows.length} sourced cases)`
  );
  console.log(
    `  Citation Recall @ 1 (sources): ${citationRecallAt1Rate !== null ? green((citationRecallAt1Rate * 100).toFixed(1) + '%') : 'N/A'}` +
    `  (${policyCasesWithRecall1}/${policyCasesCount} cases with target in top 1 citation)`
  );
  console.log(
    `  Citation Recall @ 3 (sources): ${citationRecallAt3Rate !== null ? green((citationRecallAt3Rate * 100).toFixed(1) + '%') : 'N/A'}` +
    `  (${policyCasesWithRecall3}/${policyCasesCount} cases with target in top 3 citations)`
  );
  console.log(`  Grounding Rate (answers)    : ${pct(sourcedAnswers, totalAnswers)} of answers cite policy sources`);
  console.log(`  Irrelevant / Hallucinated   : ${totalIrrelevantCitations > 0 ? red(totalIrrelevantCitations) : green('0')} (${pct(totalIrrelevantCitations, totalCitations)})`);
  console.log('');
  console.log(`  ${bold('Retrieval Recall @ K (pre-generation candidate pool):')}`);
  if (candidatePoolExposed) {
    const rAt1 = results.filter((r) => r.retrievalRecallAt1 === 1).length;
    const rAt3 = results.filter((r) => r.retrievalRecallAt3 === 1).length;
    const rAt5 = results.filter((r) => r.retrievalRecallAt5 === 1).length;
    console.log(`    Recall @ 1 : ${pct(rAt1, policyCasesCount)}`);
    console.log(`    Recall @ 3 : ${pct(rAt3, policyCasesCount)}`);
    console.log(`    Recall @ 5 : ${pct(rAt5, policyCasesCount)}`);
  } else {
    console.log(`    Status : ${yellow('IMPOSSIBLE TO CALCULATE with current Hugging Face contract')}`);
    console.log(`    Reason : The external AI service executes vector search internally and`);
    console.log(`             does not return pre-generation candidate chunks (retrieved_chunks).`);
    console.log(`             Only final selected answer citations are returned. Per system`);
    console.log(`             evaluation principles, retrieval pools will NOT be faked.`);
  }

  console.log(`\n${bold(' DECISION-TYPE ACCURACY')}`);
  console.log(LINE);
  console.log(`  ${'Decision'.padEnd(28)} ${'Total'.padEnd(8)} ${'Correct'.padEnd(10)} Accuracy`);
  console.log(LINE);
  for (const [d, v] of Object.entries(byDecision).sort((a, b) => b[1].total - a[1].total)) {
    const acc = pct(v.correct, v.total);
    const accStr = v.correct === v.total ? green(acc) : v.correct / v.total >= 0.7 ? yellow(acc) : red(acc);
    console.log(`  ${d.padEnd(28)} ${String(v.total).padEnd(8)} ${String(v.correct).padEnd(10)} ${accStr}`);
  }

  console.log(`\n${bold(' PER-CATEGORY RESULTS')}`);
  console.log(LINE);
  console.log(`  ${'Category'.padEnd(18)} ${'Total'.padEnd(8)} ${'Correct'.padEnd(10)} ${'Wrong'.padEnd(8)} Accuracy`);
  console.log(LINE);
  for (const [cat, v] of Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total)) {
    const acc = pct(v.correct, v.total);
    const accStr = v.wrong === 0 ? green(acc) : v.correct / v.total >= 0.7 ? yellow(acc) : red(acc);
    console.log(`  ${cat.padEnd(18)} ${String(v.total).padEnd(8)} ${String(v.correct).padEnd(10)} ${String(v.wrong).padEnd(8)} ${accStr}`);
  }

  console.log(`\n${bold(' KEY RATES')}`);
  console.log(LINE);
  console.log(`  Clarification rate (expected)   : ${pct(clarTotal, total)}  (${clarTotal} cases)`);
  console.log(`  Clarification accuracy          : ${pct(clarCorrect, clarTotal)}`);
  console.log(`  Handoff rate (expected)         : ${pct(handoffTotal, total)}  (${handoffTotal} cases)`);
  console.log(`  Handoff accuracy                : ${pct(handoffCorrect, handoffTotal)}`);
  console.log(`  Multi-domain detection          : ${pct(multiCorrect, multiTotal)}  (${multiTotal} cases)`);
  console.log(`  Wrong confident route           : ${wrongConfidentRoute > 0 ? red(wrongConfidentRoute) : wrongConfidentRoute}`);
  console.log(`  Spurious handoff                : ${spuriousHandoff > 0 ? yellow(spuriousHandoff) : spuriousHandoff}`);
  console.log(`  Missed handoff                  : ${missedHandoff > 0 ? red(missedHandoff) : missedHandoff}`);
  console.log(`  Missed multi-domain             : ${missedMulti > 0 ? yellow(missedMulti) : missedMulti}`);
  console.log(`  Wrong clarification (easy case) : ${wrongClarification > 0 ? yellow(wrongClarification) : wrongClarification}`);
  console.log(`  Other type mismatch             : ${wrongType}`);

  if (Object.keys(confusionMatrix).length > 0) {
    console.log(`\n${bold(' CONFUSION MATRIX (expected → predicted)')}`);
    console.log(LINE);
    const sorted = Object.entries(confusionMatrix).sort((a, b) => b[1] - a[1]);
    for (const [key, count] of sorted) {
      const isMatch = key.split(' → ')[0] === key.split(' → ')[1];
      const bar = '█'.repeat(Math.min(count, 30));
      console.log(
        `  ${isMatch ? green(key.padEnd(45)) : red(key.padEnd(45))} ${String(count).padStart(4)}  ${isMatch ? dim(bar) : yellow(bar)}`
      );
    }
  }

  // List wrong cases
  const wrongCases = results.filter((r) => !r.correct);
  if (wrongCases.length > 0) {
    console.log(`\n${bold(red(` WRONG CASES (${wrongCases.length})`))} ${dim('─'.repeat(50))}`);
    for (const r of wrongCases) {
      console.log(
        `  ${red('✘')} ${dim(r.id.padEnd(14))} ${yellow(r.errorClass || 'error')} ` +
        `expected=${bold(r.expectedDecision)} got=${bold(r.predictedDecision)} ` +
        `domain=${r.predictedDomain !== null ? (Array.isArray(r.predictedDomain) ? r.predictedDomain.join('+') : r.predictedDomain) : 'null'}`
      );
      if (VERBOSE) {
        console.log(`    ${dim('Query : ' + r.query)}`);
        if (r.notes) console.log(`    ${dim('Notes : ' + r.notes)}`);
      }
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log(`\n${bold('═'.repeat(70))}`);
  console.log(bold(` DONE — ${elapsed}s`));
  console.log(bold('═'.repeat(70)) + '\n');

  // ── Optional JSON report output ──────────────────────────────────────────
  const report = {
    meta: {
      dataset: DATASET_PATH,
      timestamp: new Date().toISOString(),
      totalCases: total,
      elapsedMs: Date.now() - startedAt,
      aiMode: 'mock',
    },
    summary: {
      correct,
      wrong,
      accuracy: parseFloat(pct(correct, total)),
      avgLatencyMs: parseFloat(avgLatency.toFixed(2)),
      sourcedAnswerRate: parseFloat(pct(sourcedAnswers, totalAnswers)),
    },
    retrievalAndCitation: {
      citationPrecision: {
        status: 'implemented',
        metric: 'Citation Precision',
        definition: 'Whether cited sources actually correspond to the retrieved/contextual evidence supporting the answer',
        microPercent: microCitationPrecision !== null ? parseFloat((microCitationPrecision * 100).toFixed(1)) : null,
        macroPercent: macroCitationPrecision !== null ? parseFloat((macroCitationPrecision * 100).toFixed(1)) : null,
        totalCitations,
        relevantCitations: totalRelevantCitations,
        irrelevantCitations: totalIrrelevantCitations,
      },
      citationRecallOnReturnedSources: {
        status: 'partially_measurable',
        metric: 'Citation Recall@K (on returned sources)',
        definition: 'Whether at least one relevant expected document appears in the top K cited sources returned with the answer',
        kValues: [1, 3],
        recallAt1Percent: citationRecallAt1Rate !== null ? parseFloat((citationRecallAt1Rate * 100).toFixed(1)) : null,
        recallAt3Percent: citationRecallAt3Rate !== null ? parseFloat((citationRecallAt3Rate * 100).toFixed(1)) : null,
        policyCasesEvaluated: policyCasesCount,
        casesWithTargetInTop1: policyCasesWithRecall1,
        casesWithTargetInTop3: policyCasesWithRecall3,
        scope: 'Evaluated across citations attached to returned answers',
      },
      retrievalRecallAtK: {
        status: retrievalRecallStatus,
        metric: 'Retrieval Recall@K (pre-generation candidate pool)',
        definition: 'Whether at least one relevant expected document/chunk appears in the top K retrieved results prior to answer generation',
        kValues: [1, 3, 5],
        recallAt1Percent: candidatePoolExposed
          ? parseFloat(((results.filter((r) => r.retrievalRecallAt1 === 1).length / policyCasesCount) * 100).toFixed(1))
          : null,
        recallAt3Percent: candidatePoolExposed
          ? parseFloat(((results.filter((r) => r.retrievalRecallAt3 === 1).length / policyCasesCount) * 100).toFixed(1))
          : null,
        recallAt5Percent: candidatePoolExposed
          ? parseFloat(((results.filter((r) => r.retrievalRecallAt5 === 1).length / policyCasesCount) * 100).toFixed(1))
          : null,
        limitation: candidatePoolExposed
          ? null
          : 'Hugging Face / external AI service executes retrieval internally and does not expose pre-generation candidate chunks (retrieved_chunks) in the response contract. Only final selected answer citations are returned. Calculating pre-generation recall without raw candidate chunks would be fabricating metrics.',
      },
    },
    rates: {
      clarificationRate: parseFloat(pct(clarTotal, total)),
      clarificationAccuracy: parseFloat(pct(clarCorrect, clarTotal)),
      handoffRate: parseFloat(pct(handoffTotal, total)),
      handoffAccuracy: parseFloat(pct(handoffCorrect, handoffTotal)),
      multiDomainDetectionRate: parseFloat(pct(multiCorrect, multiTotal)),
    },
    errorBreakdown: {
      wrongConfidentRoute,
      missedMultiDomain: missedMulti,
      wrongClarification,
      spuriousHandoff,
      missedHandoff,
      wrongType,
    },
    byCategory,
    byDecision,
    confusionMatrix,
    cases: results,
  };

  if (OUTPUT_PATH) {
    const outAbs = path.resolve(__dirname, '..', OUTPUT_PATH);
    const outDir = path.dirname(outAbs);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(report, null, 2), 'utf8');
    console.log(green(`  Report written → ${outAbs}\n`));
  }

  // ── Cleanup eval records from MongoDB ────────────────────────────────────
  if (!NO_CLEANUP) {
    try {
      const Conversation2 = require('../src/models/Conversation');
      const Turn2         = require('../src/models/Turn');
      const Ticket2       = require('../src/models/Ticket');
      const Org2          = require('../src/models/Organization');
      await Turn2.deleteMany({ orgId: EVAL_ORG_ID });
      await Ticket2.deleteMany({ orgId: EVAL_ORG_ID });
      await Conversation2.deleteMany({ orgId: EVAL_ORG_ID });
      await Org2.deleteMany({ orgId: EVAL_ORG_ID });
      console.log(dim(`  [eval] cleaned up eval records (orgId: ${EVAL_ORG_ID})`));
    } catch (err) {
      console.log(yellow(`  [eval] cleanup warning: ${err.message}`));
    }
  } else {
    console.log(yellow(`  [eval] --no-cleanup: eval records kept in DB under orgId "${EVAL_ORG_ID}"`));
  }

  await mongoose.disconnect();
  console.log(dim(`  [eval] disconnected from MongoDB\n`));

  const FAIL_ON_WRONG = args.includes('--fail-on-wrong');
  process.exit(FAIL_ON_WRONG && wrong > 0 ? 1 : 0);
})();
