/**
 * Stand-in for the AI team's FastAPI service, speaking the contract in
 * docs/AI_CONTRACT.md. Keyword-based and deterministic -- the ANSWER TEXT IS
 * PLACEHOLDER, not real university policy. Used when USE_MOCK_AI=true, and by
 * scripts/mockAiServer.js to exercise the real HTTP path.
 *
 * Takes the request body Node sends, returns the raw AI response.
 */

/// Policy topics. `label` is what the real classifier would call it.
const TOPICS = [
  { key: 'fees', label: 'Fees & Finance', re: /\b(fees?|tuition|pay\b|payments?|scholarships?|scolar\w*|refunds?|dues\b|\bdue\b(?!\s+to\b)|waivers?|installment|fine|late\s+fee|late\s+penalty|penalty.*(fee|payment|late)|(fee|payment|late).*penalty|receipt)\b/i,
    answer: 'The semester fee due date is published on the student portal under Fee Schedule; late payment attracts a fixed late fee as per policy.',
    sources: [{ document: 'fee_policy.pdf', section: 'Due Dates', score: 0.79 }] },
  { key: 'examination', label: 'Academics', re: /\b(exams?|examinat\w*|syllabus|revalu\w*|timtabl\w*|academics?|marksheet|assessment|cgpa|grades?|grading)\b/i,
    answer: 'Exam schedules and revaluation procedures are published by the Examination department; revaluation requests must be filed within the notified window.',
    sources: [{ document: 'exam_regulations.pdf', section: 'Revaluation', score: 0.83 }] },
  { key: 'facilities', label: 'Facilities', re: /\b(facilit\w*|maintenance|library|canteen|mess|classrooms?|cafeteria|projectors?|broken|repair|atm\b|gym\b|sports\s+(complex|facility|facilities|ground)|seminar\s+room|auditorium|labs?|plumbing|water\s+cooler|ac\s+repair)\b/i,
    answer: 'Maintenance requests for classrooms and campus facilities are raised through the Estate & Facilities helpdesk.',
    sources: [{ document: 'facilities_handbook.pdf', section: 'Requests', score: 0.81 }] },
  { key: 'hostel', label: 'Housing', re: /\b(hostels?|accommodation|warden|allotment|residential\s+(block|area|room))\b/i,
    answer: 'Hostel allotment opens on the university portal in the first week of the semester; room maintenance issues go to the hostel warden.',
    sources: [{ document: 'hostel_policy.pdf', section: 'Allotment', score: 0.87 }] },
  { key: 'career', label: 'Career Services', re: /\b(placements?|placem\w*|internships?|career|resume|recruit\w*|jobs?|hiring|interview|off-campus)\b/i,
    answer: 'The Placement Cell publishes drive schedules and eligibility criteria on the placement portal; internship registration opens each semester.',
    sources: [{ document: 'placement_guide.pdf', section: 'Drives', score: 0.8 }] },
  // A real classifier label that is NOT one of our five domains.
  { key: 'registration', label: 'Registration', re: /\b(registration|register|admissions?|enrol\w*)\b/i,
    answer: 'Course registration opens on the portal at the start of each semester.',
    sources: [{ document: 'registration_guide.pdf', section: 'Dates', score: 0.7 }] },
  { key: 'it', label: 'IT Helpdesk & Tech Support', re: /\b(wi-?fi|wifi|internet|network|lms|moodle|vpn)\b/i,
    answer: 'Campus Wi-Fi connectivity and IT services can be configured using your student credentials or by contacting the IT Helpdesk.',
    sources: [{ document: 'it_policy.pdf', section: 'WiFi Access', score: 0.85 }] },
];

// Questions about the student's own record, answerable from student_context.
const PERSONAL = [
  { label: 'Academics', re: /\b(my\s+attendance|attendance\s+percent\w*|what('?s|\s+is)\s+my\s+attendance)\b/i, text: (c) => c.attendance_percent != null ? `Your attendance is ${c.attendance_percent}%.` : null },
  { label: 'Fees & Finance', re: /\bmy (fees?\s+)?(balance|dues)\b|\bhow much (do )?i owe\b|\bfee\s+balance\b/i, text: (c) => c.fee_balance != null ? `Your fee balance is ${c.fee_balance}.` : null },
  { label: 'Registration', re: /\b(which|what)\s+semester\s+(am\s+i|i\s+am)\b|\bwhat('?s|\s+is)\s+my\s+semester\b|\bmy\s+semester\s*\?*$/i, text: (c) => c.semester != null ? `You are in semester ${c.semester}.` : null },
  { label: 'Housing', re: /\b(what('?s|\s+is)|which('?s|\s+is)|tell me|check)\s+(my\s+)?(hostel\s+)?room\b|\b(which|what)\s+(hostel\s+)?room\s+(am\s+i|i\s+am)\b|\bmy (hostel\s+)?room (number|no\.?|allotment)\b|\bmy (hostel\s+)?room\?*$/i, text: (c) => c.hostel_room && c.hostel_room !== 'N/A' ? `Your hostel room is ${c.hostel_room}.` : 'No hostel room is recorded for you.' },
  { label: 'Academics', re: /\bmy (program|course|branch)\b/i, text: (c) => c.program ? `Your program is ${c.program}.` : null },
];

const GREETING_RE = /^(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening))\b/i;
const JOINER_RE = /\b(and|also|plus|then)\b|\?.*\?/i;

function computeDynamicScore(query, domainLabel, isContext = false) {
  const q = String(query || '').toLowerCase().trim();
  let base = isContext ? 0.94 : 0.86;

  // High-value specificity tokens
  if (/\b(revaluation|tuition|scholarship|attendance|hall ticket|allotment|placement drive|transcript|provisional|admit card)\b/i.test(q)) {
    base += 0.05;
  }
  // Common policy tokens
  if (/\b(semester|exam|fees|hostel|placement|internship|maintenance|cgpa|deadline)\b/i.test(q)) {
    base += 0.03;
  }
  // Word count / query complexity factor
  const words = q.split(/\s+/).filter(Boolean).length;
  if (words >= 5) {
    base += 0.02;
  } else if (words <= 2) {
    base -= 0.04;
  }

  // Deterministic variation based on character codes
  let sum = 0;
  for (let i = 0; i < q.length; i++) {
    sum = (sum * 31 + q.charCodeAt(i)) & 0xffffff;
  }
  const variance = ((sum % 9) - 4) / 100;

  return Math.min(0.98, Math.max(0.74, Number((base + variance).toFixed(2))));
}

function makeDomainScores(primaryDomain, score) {
  const runnerUps = ['Academics', 'Fees & Finance', 'Facilities', 'Career Services', 'General']
    .filter((d) => d !== primaryDomain);
  const remaining = Number((1 - score).toFixed(4));
  const s1 = Number((remaining * 0.6).toFixed(4));
  const s2 = Number((remaining * 0.3).toFixed(4));
  const s3 = Number((remaining * 0.1).toFixed(4));
  return {
    [primaryDomain]: score,
    [runnerUps[0]]: s1,
    [runnerUps[1]]: s2,
    [runnerUps[2]]: s3,
  };
}

const ctxAnswer = (label, text, query = '') => {
  const score = computeDynamicScore(query, label, true);
  return {
    decision: 'answer',
    domain: label,
    confidence: score,
    answer: text,
    sources: [],
    domain_scores: makeDomainScores(label, score),
    used_student_context: true,
  };
};

const topicAnswer = (t, extra = {}, query = '') => {
  const score = computeDynamicScore(query, t.label, false);
  return {
    decision: 'answer',
    domain: t.label,
    confidence: score,
    answer: t.answer,
    sources: t.sources,
    domain_scores: makeDomainScores(t.label, score),
    ...extra,
  };
};

function mockAiRaw(body) {
  const q = String(body.query || '').toLowerCase().trim();
  const ctx = body.student_context || null;

  // 1. Greetings / thanks
  if (q.length <= 40 && GREETING_RE.test(q)) {
    return {
      decision: 'greeting', domain: 'General', confidence: 0.97,
      answer: /^thank/i.test(q) ? "You're welcome! Let me know if there's anything else." : 'Hello! How can I help you today?',
    };
  }

  // Explicit human / advisor follow-up request
  if (/\b(human|advisor|counselor|escalat\w*|speak (to|with) someone|talk to someone|connect me with staff|live support)\b/i.test(q)) {
    return {
      decision: 'handoff',
      handoff_reason: 'human_requested',
      message: "I understand. I've logged this inquiry and opened a support ticket for an advisor to follow up with you.",
    };
  }

  // 2. The student is answering a clarification: pick the chosen candidate.
  if (body.mode === 'clarification_answer' && Array.isArray(body.candidate_domains) && body.candidate_domains.length) {
    const byKeyword = TOPICS.find((t) => t.re.test(q));
    const wanted = byKeyword && body.candidate_domains.includes(byKeyword.key === 'hostel' ? 'facilities' : byKeyword.key === 'career' ? 'career_services' : byKeyword.key)
      ? byKeyword
      : TOPICS.find((t) => t.key === body.candidate_domains[0]) || TOPICS[0];
    return topicAnswer(wanted, {}, q);
  }

  // 3. Multi-domain query check (before single-topic shortcuts & clarification overrides)
  const hits = TOPICS.filter((t) => t.re.test(q));
  const canonical = (k) => (k === 'hostel' ? 'facilities' : k);
  const distinctDomainKeys = [...new Set(hits.map((t) => canonical(t.key)))];

  if (distinctDomainKeys.length >= 2 && JOINER_RE.test(q)) {
    const uniqueHits = distinctDomainKeys.map((k) => hits.find((t) => canonical(t.key) === k));
    const multiScore = computeDynamicScore(q, uniqueHits[0].label, false);
    return {
      decision: 'multi_answer', domain: uniqueHits[0].label, confidence: multiScore,
      domains: uniqueHits.map((t) => ({ domain: t.label, confidence: Number((multiScore - 0.05).toFixed(2)) })),
      answers: uniqueHits.map((t) => ({ domain: t.label, answer: t.answer, confidence: Number((multiScore - 0.05).toFixed(2)), sources: t.sources })),
    };
  }

  // 4. Ambiguous cross-domain clarifications
  if (/\bplacement\s+portal\b/i.test(q)) {
    return {
      decision: 'clarification', domain: 'Career Services', confidence: 0.45,
      clarification_options: ['Career Services', 'IT Helpdesk & Tech Support'],
      message: 'Are you asking about placement schedules or technical issues with the portal?',
    };
  }
  if (/\b(internship\s+stipend|stipend)\b/i.test(q)) {
    return {
      decision: 'clarification', domain: 'Career Services', confidence: 0.45,
      clarification_options: ['Career Services', 'Fees & Finance'],
      message: 'Which area are you asking about — internship placement terms or fee accounts?',
    };
  }
  if (/\b(hostel\s+maintenance|maintenance\s+fee|maintenance.*pay|pay.*maintenance)\b/i.test(q) && !JOINER_RE.test(q)) {
    return {
      decision: 'clarification', domain: 'Facilities', confidence: 0.45,
      clarification_options: ['Facilities', 'Fees & Finance'],
      message: 'Is this about a maintenance request or payment of maintenance fees?',
    };
  }

  // 5. Personal questions -> answered from student_context
  const personalHits = PERSONAL.filter((p) => p.re.test(q));
  if (personalHits.length) {
    const lines = ctx ? personalHits.map((p) => p.text(ctx)).filter(Boolean) : [];
    if (!lines.length) return { decision: 'no_answer', domain: personalHits[0].label, confidence: 0.8, no_answer: true, sources: [] };
    const policy = TOPICS.find((t) => t.re.test(q));
    return ctxAnswer(personalHits[0].label, [...lines, ...(policy ? [policy.answer] : [])].join(' '), q);
  }

  // 6. A topic we have no documents for (demonstrates the no-answer path)
  if (/\brefunds?\b/i.test(q)) {
    return { decision: 'no_answer', domain: 'Fees & Finance', confidence: 0.8, no_answer: true, sources: [] };
  }

  // 7. Disambiguation precedence for common compound mentions
  if (/\b(placements?|recruit\w*)\b/i.test(q) && /\bcgpa\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'career'), {}, q);
  }
  if (/\b(projectors?|broken|lecture\s+hall)\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'facilities'), {}, q);
  }
  if (/\b(canteen|cafeteria|mess)\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'facilities'), {}, q);
  }
  if (/\bmock\s+interview\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'career'), {}, q);
  }
  if (/\brecruit\w*|placements?|internships?\b/i.test(q) && /\bregister\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'career'), {}, q);
  }
  if (/\bexam\w*\b/i.test(q) && /\bregist\w*\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'examination'), {}, q);
  }
  if (/\bplacement\s+drive\b/i.test(q) && /\bacademic\b/i.test(q)) {
    return topicAnswer(TOPICS.find((t) => t.key === 'career'), {}, q);
  }

  // 8. Policy topics
  if (hits.length >= 2) {
    if (distinctDomainKeys.length === 1) {
      return topicAnswer(hits[0], {}, q);
    }
    return {
      decision: 'clarification', domain: hits[0].label, confidence: 0.45,
      clarification_options: hits.map((t) => t.label),
      message: 'Your question could be about more than one area — which did you mean?',
    };
  }
  if (hits.length === 1) return topicAnswer(hits[0], {}, q);

  if (/\bdeadline\b/i.test(q)) {
    return {
      decision: 'clarification', domain: 'Fees & Finance', confidence: 0.4,
      clarification_options: ['Fees & Finance', 'Academics'],
      message: 'Which deadline are you asking about — fee payment or exam form submission?',
    };
  }

  // 9. Unknown: the classifier lands on a label outside our five.
  return { decision: 'answer', domain: 'Student Life', confidence: 0.35, answer: 'Student clubs and events are listed on the student life page.', sources: [] };
}

module.exports = { mockAiRaw };
