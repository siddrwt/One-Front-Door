/**
 * Smoke test against a RUNNING server (npm start, MongoDB up, USE_MOCK_AI=true
 * or `npm run mock:ai` + USE_MOCK_AI=false). Logs in as a seeded demo student
 * and checks one query per behaviour. The mock AI's answer text is placeholder;
 * what is checked is the response type and kind.
 *
 *   npm run seed:students     (once)
 *   npm start                 (terminal 1)
 *   npm run test:queries      (terminal 2)
 *
 * No server or database needed? Run `npm test` instead (full flow, in-memory).
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const DEMO_LOGIN = {
  email: process.env.DEMO_STUDENT_EMAIL || 'aryan.sharma@demo.camu.edu',
  password: process.env.DEMO_STUDENT_PASSWORD || 'demoPass123',
};

const cases = [
  { name: 'policy answer', message: 'When is the semester fee due?', type: 'answer', domain: 'fees' },
  { name: 'clarification', message: 'What is the deadline?', type: 'clarification' },
  { name: 'multi_answer', message: 'What is the fee deadline and where is the placement cell?', type: 'multi_answer' },
  { name: 'IT -> handoff + ticket', message: 'My wifi is not working', type: 'handoff' },
  { name: 'personal (own record)', message: 'What is my attendance?', type: 'answer', answerMatches: /%/ },
  { name: 'data we do not hold', message: 'What are my results?', type: 'answer', replyKind: 'personal_data_unavailable' },
  { name: 'out of scope', message: 'Tell me about student clubs', type: 'answer', replyKind: 'out_of_scope' },
  { name: 'greeting', message: 'hello', type: 'answer', replyKind: 'greeting' },
];

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO_LOGIN),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}) — did you run "npm run seed:students"?`);
  return (await res.json()).token;
}

async function run() {
  const token = await login();
  console.log('[auth] logged in as demo student\n');

  let passed = 0;
  for (const c of cases) {
    // A fresh conversation per case, so one case can't affect the next.
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: c.message }),
    });
    const data = await res.json();

    const ok =
      res.status === 200 &&
      data.type === c.type &&
      (!c.domain || data.domain === c.domain) &&
      (!c.replyKind || data.replyKind === c.replyKind) &&
      (!c.answerMatches || c.answerMatches.test(data.answer || ''));

    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${c.name}: "${c.message}" -> ${data.type}${data.replyKind ? ` (${data.replyKind})` : ''}`);
    if (ok) passed += 1;
    else console.log('  response:', JSON.stringify(data, null, 2));
  }

  console.log(`\n${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

run().catch((err) => {
  console.error('Test script failed to run — is the server up? (npm start)', err.message);
  process.exit(1);
});
