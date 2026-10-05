/** Fixed, student-facing replies that Node (not the AI) is responsible for. */
const { DEPARTMENTS } = require('./domains');

const OUT_OF_SCOPE_REPLY =
  'That is outside what I can help with. I can answer questions about fees, examinations, IT, facilities and career services — for anything else, please contact the relevant university office directly.';

// Used when the AI doesn't supply its own greeting text.
const GREETING_REPLY =
  "Hello! I'm the campus assistant. I can help with fees, examinations, IT, facilities and career services — what would you like to know?";

const PERSONAL_DATA_UNAVAILABLE_REPLY =
  "I don't have your results, marks or grades available here — please check them on the CAMU portal.";

const IT_HANDOFF_REPLY =
  "This looks like an IT issue. I've logged a request so the IT team can follow up with you.";

const SECURITY_OVERRIDE_REPLY =
  "I am the campus assistant and can only help with university-related questions regarding fees, examinations, IT, facilities, and career services. I cannot override system rules or reveal internal prompts.";

const AI_FAILURE_REPLY =
  "I'm having trouble reaching my knowledge system right now. I've logged this for a human follow-up.";

const HANDOFF_GENERIC_REPLY = "I've logged this for a human follow-up.";

const DOMAIN_NAMES = {
  fees: 'fees',
  examination: 'examinations',
  it: 'IT',
  facilities: 'facilities',
  career_services: 'career services',
};

// Used when the AI service asks for clarification but sends no question text.
function clarificationQuestion(domains) {
  const names = domains.map((d) => DOMAIN_NAMES[d] || d);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0];
  return `Which area do you mean — ${list}?`;
}

function noAnswerReply(domain) {
  const dept = DEPARTMENTS[domain] || 'the relevant university office';
  return `I couldn't find verified information about this in the available knowledge base. Please contact ${dept} for assistance.`;
}

module.exports = {
  OUT_OF_SCOPE_REPLY,
  GREETING_REPLY,
  PERSONAL_DATA_UNAVAILABLE_REPLY,
  IT_HANDOFF_REPLY,
  SECURITY_OVERRIDE_REPLY,
  AI_FAILURE_REPLY,
  HANDOFF_GENERIC_REPLY,
  clarificationQuestion,
  noAnswerReply,
};
