/**
 * TEMPORARY. The trained classifier has no IT label yet, so Node recognises
 * obvious IT-support questions itself and sends them to human handoff.
 * Turn it off with IT_KEYWORD_RULE=false once the AI team's model routes
 * IT questions (their "IT" label is already mapped in config/domains.js).
 *
 * Phrases, not single words: "internet" alone is too broad, but
 * "internet not working" is clearly a support request.
 */
const IT_PATTERNS = [
  /\bwi-?fi\b/i,
  /\b(internet|network|vpn|lan)\s+(is\s+|isn'?t\s+|not\s+)?(not\s+)?(working|down|slow|issue|problem|error|connecting|connected)/i,
  /\b(reset|forgot|forgotten|change|recover)\w*\s+(my\s+|the\s+)?([\w\s]{0,25})?password\b/i,
  /\bpassword\s+(reset|recovery|not\s+working|change)\b/i,
  /\b(can'?t|cannot|unable\s+to|couldn'?t)\s+(log\s?in|sign\s?in|access\s+(my\s+)?(account|email|lms|portal)|get\s+online|connect)/i,
  /\b(network|connection|internet)\s+(seems\s+)?(broken|down|slow|offline)\b/i,
  /\blogin\s+(issue|problem|error|failed)\b/i,
  /\b(lms|moodle)\s+(is\s+)?(not\s+working|down|issue|problem|error|access)/i,
  /\b(campus|university|college)\s+(email|mail)\s+(id|account|access|not\s+working)/i,
  /\b(software|antivirus|office\s*365|microsoft\s+office)\s+(install|installation|license|licence|download|activation)/i,
  /\b(it\s+team|it\s+helpdesk|it\s+support)\b/i,
];

const NON_IT_INTENT_PATTERNS = [
  /\b(fees?|tuition|payments?|scholarships?|refunds?|dues?|balance|financial\s+aid)\b/i,
  /\b(exams?|examinations?|syllabus|revaluation|timetable|academics?|grading|grades?|attendance|marks?)\b/i,
  /\b(facilit\w*|maintenance|library|canteen|mess|classrooms?|labs?|infrastructure)\b/i,
  /\b(hostels?|accommodation|warden|allotment)\b/i,
  /\b(placements?|internships?|careers?|resume|recruit\w*|jobs?)\b/i,
  /\b(registration|register|admissions?|enrol\w*)\b/i,
];

const MULTI_INTENT_JOINER = /\b(and|also|plus|as well as|along with|then)\b|\?.*\?/i;

function isItQuestion(text) {
  return IT_PATTERNS.some((p) => p.test(text));
}

function hasMultipleIntents(text) {
  if (!text || typeof text !== 'string') return false;
  const textWithoutLocation = text.replace(/\bin\s+(my\s+)?(the\s+)?(hostel\s+room|hostel|room|classroom|library|campus|hall)\b/gi, '');
  const matchesNonIt = NON_IT_INTENT_PATTERNS.some((p) => p.test(textWithoutLocation));
  const hasJoiner = MULTI_INTENT_JOINER.test(text) || (text.match(/\?/g) || []).length > 1;
  // If query mentions IT and another distinct university domain with a joiner
  if (isItQuestion(text) && matchesNonIt && hasJoiner) return true;
  // If query has multiple non-IT domains joined together
  if (matchesNonIt && hasJoiner) {
    const nonItMatches = NON_IT_INTENT_PATTERNS.filter((p) => p.test(textWithoutLocation)).length;
    if (nonItMatches >= 2) return true;
  }
  return false;
}

function isClearlyItOnlyQuestion(text) {
  if (!isItQuestion(text)) return false;
  return !hasMultipleIntents(text);
}

module.exports = { isItQuestion, hasMultipleIntents, isClearlyItOnlyQuestion };
