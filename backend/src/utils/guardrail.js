/**
 * Personal data we do NOT have. The student's fixed demo record holds only
 * program, semester, attendance, fee balance and hostel room, and those are
 * answered (see studentContextService.js). Anything else personal -- results,
 * marks, grades, CGPA -- is blocked here BEFORE the AI call, so the AI is
 * never asked to answer from data that doesn't exist.
 *
 * Keyword filter, deliberately narrow: "how is my CGPA calculated" is also
 * caught (errs towards blocking).
 */
const UNAVAILABLE_PERSONAL_PATTERNS = [
  /\bmy\s+(results?|marks|grades?|scores?|cgpa|sgpa|gpa|rank|transcripts?)\b/i,
  /\b(how many|do i have( any)?|check|my)\s+backlogs?\b/i,
  /\bmy\s+(roll\s*(number|no\.?)|enrol+ment\s*(number|no\.?)|student\s*id)\b/i,
];

function isUnavailablePersonalData(text) {
  return UNAVAILABLE_PERSONAL_PATTERNS.some((p) => p.test(text));
}

/**
 * Lightweight heuristic detection layer for obvious prompt-injection override attempts.
 *
 * NOTE: This is a focused heuristic guardrail for obvious patterns, NOT a full AI
 * security product. Advanced obfuscations, encoding tricks, or multi-turn jailbreaks
 * require multi-layered model-level defenses.
 */
const PROMPT_INJECTION_PATTERNS = [
  // 1. Direct instruction override / disregard directives
  {
    name: 'instruction_override',
    regex: /\b(ignore|disregard|forget|bypass|override)\s+(all\s+|any\s+|the\s+|your\s+)?((previous|prior|above|existing|system|core)\s+)?instructions\b/i,
  },
  {
    name: 'disregard_instructions',
    regex: /\b(disregard|ignore)\s+the\s+instructions\b/i,
  },

  // 2. System prompt exfiltration
  {
    name: 'system_prompt_exfiltration',
    regex: /\b(reveal|show|display|print|output|tell\s+me|repeat|leak|give\s+me)\s+(all\s+|the\s+|your\s+)?(system\s+prompt|initial\s+prompt|system\s+instructions|developer\s+prompt)\b/i,
  },
  {
    name: 'system_prompt_query',
    regex: /\bwhat\s+(is|was|are)\s+(the\s+|your\s+)?(system\s+prompt|initial\s+prompt|developer\s+instructions)\b/i,
  },

  // 3. Role / persona override attempts ("you are now...")
  {
    name: 'role_override_now',
    regex: /\byou\s+are\s+now\s+(a\b|an\b|in\b|to\b|acting\b|operating\b|entering\b|unrestricted\b|unfiltered\b|jailbroken\b|DAN\b|free\b|no\s+longer\b|my\b|the\b|\w+\s+mode\b|evil\b)/i,
  },
  {
    name: 'role_override_from_now',
    regex: /\bfrom\s+now\s+on\b.*\b(you\s+(are|will|must|should)|act\s+as|pretend\s+to\s+be)\b/i,
  },
  {
    name: 'persona_override',
    regex: /\b(act\s+as|pretend\s+to\s+be)\s+(a\s+|an\s+)?(unrestricted|unfiltered|jailbreak|DAN|evil|hacker|root|admin)\b/i,
  },

  // 4. Safety & filter override directives
  {
    name: 'safety_override',
    regex: /\b(override|bypass|disable)\s+(all\s+|the\s+|your\s+)?(safety|filters?|guardrails?|security\s+rules?)\b/i,
  },
];

/**
 * Detect obvious prompt injection attempts.
 * Returns { detected: boolean, pattern: string | null }
 */
function detectPromptInjection(text) {
  if (!text || typeof text !== 'string') return { detected: false, pattern: null };
  const str = text.trim();
  for (const { name, regex } of PROMPT_INJECTION_PATTERNS) {
    if (regex.test(str)) {
      return { detected: true, pattern: name };
    }
  }
  return { detected: false, pattern: null };
}

function isPromptInjection(text) {
  return detectPromptInjection(text).detected;
}

/**
 * Validates untrusted retrieved document context.
 * Returns true if the content is clean, false if override directives are present.
 */
function isUntrustedContextSafe(text) {
  if (!text || typeof text !== 'string') return true;
  return !detectPromptInjection(text).detected;
}

module.exports = {
  isUnavailablePersonalData,
  detectPromptInjection,
  isPromptInjection,
  isUntrustedContextSafe,
  PROMPT_INJECTION_PATTERNS,
};
