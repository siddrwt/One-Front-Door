/** Unit tests for the AI adapter (services/aiService.js). No server, DB or network: npm run test:adapter */
const axios = require('axios');
const config = require('../src/config');
const { normalizeAiResponse, buildRequest, callPipeline, AiContractError } = require('../src/services/aiService');
const { OUR_DOMAINS } = require('../src/config/domains');

let pass = 0, fail = 0;
const check = (name, cond, extra) => { cond ? pass++ : (fail++, console.log(`FAIL  ${name}${extra !== undefined ? '  -> ' + JSON.stringify(extra) : ''}`)); };
const norm = (raw, opts) => normalizeAiResponse(raw, opts);
const throwsContract = (raw) => { try { norm(raw); return false; } catch (e) { return e instanceof AiContractError; } };

// ---- label mapping ---------------------------------------------------------
let r = norm({ response: 'x', domain: 'Fees & Finance', confidence: 0.9, sources: [{ document: 'a.pdf' }] });
check('legacy shape: answer / fees', r.type === 'answer' && r.domain === 'fees' && r.routingScore === 0.9 && r.sources[0].document === 'a.pdf', r);
check('Academics -> examination', norm({ answer: 'x', domain: 'Academics' }).domain === 'examination');
check('Housing -> facilities', norm({ answer: 'x', domain: 'Housing' }).domain === 'facilities');
check('Facilities -> facilities', norm({ answer: 'x', domain: 'Facilities' }).domain === 'facilities');
check('Career Services -> career_services', norm({ answer: 'x', domain: 'Career Services' }).domain === 'career_services');
check('our own ids accepted', norm({ answer: 'x', domain: 'fees' }).domain === 'fees');
check('IT label (future) -> it', norm({ answer: 'x', domain: 'IT Helpdesk & Tech Support' }).domain === 'it');

// ---- out of scope / greeting / personal bypass -----------------------------
r = norm({ answer: 'x', domain: 'Registration' });
check('Registration -> out_of_scope reply', r.type === 'answer' && r.replyKind === 'out_of_scope' && r.domain === null, r);
check('Student Life -> out_of_scope', norm({ answer: 'x', domain: 'Student Life' }).replyKind === 'out_of_scope');
r = norm({ response: 'junk retrieved text', domain: 'General' });
check('General label -> fixed greeting', r.replyKind === 'greeting' && /Hello/.test(r.answer), r);
r = norm({ decision: 'greeting', domain: 'General', answer: "You're welcome!" });
check('explicit greeting uses AI text', r.replyKind === 'greeting' && r.answer === "You're welcome!", r);
r = norm({ decision: 'answer', domain: 'Registration', answer: 'You are in semester 5.', used_student_context: true });
check('personal answer bypasses out-of-scope', r.replyKind === null && r.answer === 'You are in semester 5.', r);
check('AI out_of_scope decision', norm({ decision: 'out_of_scope' }).replyKind === 'out_of_scope');

// ---- clarification ---------------------------------------------------------
r = norm({ decision: 'clarification', clarification_options: ['Fees & Finance', 'Academics'], message: 'Which one?' });
check('clarification v1', r.type === 'clarification' && r.candidateDomains.join() === 'fees,examination' && r.message === 'Which one?', r);
r = norm({ needs_clarification: true, response: 'ignored', clarification_options: ['Fees & Finance', 'Academics'] });
check('clarification legacy -> default question', r.type === 'clarification' && /fees or examinations/.test(r.message), r);
r = norm({ decision: 'clarification', clarification_options: ['Facilities', 'Housing'] });
check('clarification collapsing to 1 domain -> department reply', r.replyKind === 'no_answer' && /Estate & Facilities/.test(r.answer), r);
r = norm({ decision: 'clarification', clarification_options: ['Registration', 'Admissions'] });
check('clarification with no domain of ours -> out_of_scope', r.replyKind === 'out_of_scope', r);
r = norm({ decision: 'clarification', clarification_options: ['Fees & Finance', 'Registration'] });
check('clarification with 1 of ours + explicit answer -> answer', norm({ decision: 'clarification', clarification_options: ['Fees & Finance', 'Registration'], answer: 'ok' }).type === 'answer');

// ---- multi_answer ----------------------------------------------------------
const two = { decision: 'multi_answer', answers: [
  { domain: 'Fees & Finance', answer: 'Fee part.', confidence: 0.8, sources: [{ document: 'f.pdf' }] },
  { domain: 'Career Services', answer: 'Career part.', confidence: 0.7, sources: [{ document: 'c.pdf' }] } ] };
r = norm(two);
check('multi_answer: 2 domains, one line each', r.type === 'multi_answer' && r.answer === 'Fee part.\n\nCareer part.' && r.answers.map((a) => a.domain).join() === 'fees,career_services', r);
check('multi_answer keeps per-domain sources', r.answers[0].sources[0].document === 'f.pdf' && r.answers[1].sources[0].document === 'c.pdf');
r = norm({ decision: 'multi_answer', answers: [two.answers[0], { domain: 'Registration', answer: 'x' }] });
check('multi_answer: part outside our domains dropped -> single answer', r.type === 'answer' && r.domain === 'fees', r);
r = norm({ decision: 'multi_answer', answers: [{ domain: 'Facilities', answer: 'A.' }, { domain: 'Housing', answer: 'B.' }] });
check('multi_answer: Facilities+Housing merge', r.type === 'answer' && r.domain === 'facilities' && r.answer === 'A.\nB.', r);
r = norm({ decision: 'multi_answer', answers: [{ domain: 'Registration', answer: 'x' }] });
check('multi_answer: nothing of ours -> out_of_scope', r.replyKind === 'out_of_scope', r);
r = norm({ answers: two.answers }); // legacy-style: no decision, answers present
check('answers[] without decision -> multi_answer', r.type === 'multi_answer', r);

// ---- no-answer fallback ----------------------------------------------------
r = norm({ answer: 'x', domain: 'Facilities', no_answer: true });
check('no_answer -> Estate & Facilities', r.replyKind === 'no_answer' && /Estate & Facilities/.test(r.answer) && r.domain === 'facilities', r);
check('no_answer -> Placement Cell', /Placement Cell/.test(norm({ decision: 'no_answer', domain: 'Career Services' }).answer));
check('no_answer -> Fees department', /Fees department/.test(norm({ decision: 'no_answer', domain: 'Fees & Finance' }).answer));
check('no_answer -> Examination department', /Examination department/.test(norm({ decision: 'no_answer', domain: 'Academics' }).answer));
check('no_answer for unknown label -> out_of_scope', norm({ decision: 'no_answer', domain: 'Registration' }).replyKind === 'out_of_scope');
check('requireSources=false keeps empty-source answer', norm({ answer: 'x', domain: 'Fees & Finance', sources: [] }, { requireSources: false }).replyKind === null);
check('requireSources=true: empty sources -> no_answer', norm({ answer: 'x', domain: 'Fees & Finance', sources: [] }, { requireSources: true }).replyKind === 'no_answer');
check('requireSources=true: personal answer exempt', norm({ answer: 'x', domain: 'Fees & Finance', sources: [], used_student_context: true }, { requireSources: true }).replyKind === null);

// ---- organization enabledDomains ------------------------------------------
check('disabled domain -> out_of_scope', norm({ answer: 'x', domain: 'Academics' }, { enabledDomains: ['fees'] }).replyKind === 'out_of_scope');
check('enabled domain passes', norm({ answer: 'x', domain: 'Fees & Finance' }, { enabledDomains: ['fees'] }).domain === 'fees');

// ---- scores / sources ------------------------------------------------------
r = norm({ answer: 'x', domain: 'Fees & Finance', domain_scores: { 'Fees & Finance': 0.9, Housing: 0.5, General: 0.1 } });
check('margin from domain_scores', r.routingMargin === 0.4, r.routingMargin);
check('explicit margin wins', norm({ answer: 'x', domain: 'Fees & Finance', routing_margin: 0.2 }).routingMargin === 0.2);
r = norm({ answer: 'x', domain: 'Fees & Finance', sources: ['plain.pdf', { title: 'T', chunk_id: 'c1', url: 'http://u' }, 42] });
check('sources normalised', r.sources.length === 2 && r.sources[0].document === 'plain.pdf' && r.sources[1].document === 'T' && r.sources[1].chunkId === 'c1', r.sources);

// ---- handoff decision ------------------------------------------------------
r = norm({ decision: 'handoff', handoff_reason: 'needs_human' });
check('AI handoff decision', r.type === 'handoff' && r.reason === 'needs_human', r);

// ---- malformed -------------------------------------------------------------
check('malformed: null', throwsContract(null));
check('malformed: array', throwsContract([]));
check('malformed: empty object', throwsContract({}));
check('malformed: unknown decision', throwsContract({ decision: 'banana' }));
check('malformed: multi_answer without answers', throwsContract({ decision: 'multi_answer' }));
check('malformed: mapped domain, no text', throwsContract({ domain: 'Fees & Finance', decision: 'answer' }));
check('malformed: part without text', throwsContract({ decision: 'multi_answer', answers: [{ domain: 'Fees & Finance' }] }));

// ---- request body ----------------------------------------------------------
const body = buildRequest({ query: 'q', conversationId: 'c1', orgId: 'o', studentContext: { semester: 5 }, conversationHistory: [{ role: 'user', text: 'a' }], mode: 'clarification_answer', candidateDomains: ['fees'], originalQuery: 'oq' });
check('request has all contract fields', ['query', 'conversation_id', 'org_id', 'student_context', 'conversation_history', 'mode', 'candidate_domains', 'original_query', 'bias_domain', 'bias_amount'].every((k) => k in body), Object.keys(body));
check('request values', body.conversation_id === 'c1' && body.mode === 'clarification_answer' && body.original_query === 'oq' && body.bias_domain === null);

// ---- failure handling (callPipeline never throws) --------------------------
(async () => {
  config.useMockAi = false;
  const original = axios.post;
  const run = async (impl) => { axios.post = impl; return callPipeline({ query: 'q', orgId: 'o', conversationId: 'c', enabledDomains: OUR_DOMAINS }); };
  const quiet = console.error; console.error = () => {};

  let h = await run(async () => { const e = new Error('timeout of 15000ms exceeded'); e.code = 'ECONNABORTED'; throw e; });
  check('timeout -> handoff ai_timeout', h.type === 'handoff' && h.reason === 'ai_timeout', h);
  h = await run(async () => { const e = new Error('Request failed'); e.response = { status: 500 }; throw e; });
  check('HTTP 5xx -> handoff ai_http_error', h.reason === 'ai_http_error', h);
  h = await run(async () => { const e = new Error('connect ECONNREFUSED'); e.code = 'ECONNREFUSED'; throw e; });
  check('connection refused -> handoff ai_unavailable', h.reason === 'ai_unavailable', h);
  h = await run(async () => ({ data: { foo: 'bar' } }));
  check('malformed body -> handoff ai_malformed_response', h.reason === 'ai_malformed_response', h);
  h = await run(async () => ({ data: 'not json' }));
  check('non-object body -> handoff ai_malformed_response', h.reason === 'ai_malformed_response', h);
  h = await run(async () => ({ data: { decision: 'answer', domain: 'Fees & Finance', answer: 'ok', sources: [{ document: 'd' }] } }));
  check('valid body -> normalized answer with latency', h.type === 'answer' && h.domain === 'fees' && typeof h.aiLatencyMs === 'number', h);

  console.error = quiet; axios.post = original;
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
