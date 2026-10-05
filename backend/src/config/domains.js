/**
 * Single source of truth for the domains this system supports and for how the
 * AI side's labels map onto them.
 *
 * The trained classifier has 12 labels (Academics, Admissions, Career
 * Services, Disciplinary, Facilities, Fees & Finance, General, Health &
 * Wellness, Housing, International, Registration, Student Life). We support
 * five domains. Labels with no mapping are "out of scope" (see aiService.js).
 */
const OUR_DOMAINS = ['fees', 'examination', 'it', 'facilities', 'career_services'];

// AI label (lowercased) -> our domain id. Our own ids map to themselves so the
// AI side may return either form.
const LABEL_TO_DOMAIN = {
  'fees & finance': 'fees',
  fees: 'fees',

  academics: 'examination',
  examination: 'examination',

  facilities: 'facilities',
  housing: 'facilities', // hostel / accommodation questions

  'career services': 'career_services',
  career_services: 'career_services',
  career: 'career_services',

  // Not in the trained model yet. These start working as soon as the AI team
  // adds an IT label; until then the Node-side IT keyword rule covers it.
  'it helpdesk & tech support': 'it',
  'it helpdesk': 'it',
  it: 'it',
};

// The classifier's catch-all label. Used for greetings / thanks / chit-chat.
const GREETING_LABELS = ['general'];

// Who the student is pointed to when the domain is clear but nothing relevant
// was found in the knowledge base.
const DEPARTMENTS = {
  fees: 'the Fees department',
  examination: 'the Examination department',
  it: 'the IT department',
  facilities: 'Estate & Facilities',
  career_services: 'the Placement Cell',
};

const normalizeKey = (label) => String(label ?? '').trim().toLowerCase();

/** AI label (or our own id) -> our domain id, or null if it isn't one of ours. */
function toDomain(label) {
  if (label === null || label === undefined || label === '') return null;
  return LABEL_TO_DOMAIN[normalizeKey(label)] || null;
}

function isGreetingLabel(label) {
  return GREETING_LABELS.includes(normalizeKey(label));
}

module.exports = { OUR_DOMAINS, LABEL_TO_DOMAIN, DEPARTMENTS, toDomain, isGreetingLabel };
