# Node ↔ AI service contract

Written for the AI team. Everything here is what the Node backend **already
implements** (`src/services/aiService.js`, covered by `npm test`), so building
to this document means integration works without further Node changes.

## Who does what

| Node backend (MongoDB) | AI service (FastAPI) |
|---|---|
| Login/JWT, student record, organizations | Domain classification |
| Conversations, turns, tickets, feedback | RAG retrieval over the knowledge base |
| Sends the context below with every call | LLM answer generation |
| Maps the AI's reply to the frontend contract | Clarification / multi-question decisions |
| Fixed replies: out-of-scope, greeting, department fallback | Follow-up and clarification-reply handling |

The AI service is **stateless**. It stores nothing: no users, conversations,
messages or routing decisions (so no PostgreSQL, no Redis). Node saves
whatever needs saving. The knowledge base lives in **MongoDB Atlas Vector
Search** (retriever already reads it; ingestion must write to the same
database/collection/index, not Qdrant).

## Transport

- `POST {AI_SERVICE_URL}`, default `http://127.0.0.1:8000/api/v1/chat`, JSON body.
- `GET /api/v1/health` is used by Node's `GET /health/ai`.
- Node sends an `X-Request-Id` header; log it so one chat can be traced across both services.
- Timeout: `AI_SERVICE_TIMEOUT_MS` (default 30 s). A timeout, a non-2xx status, a connection error
  or a malformed body all become a **handoff + ticket** for the student, so return 2xx with a valid body
  for anything you can answer, including "I found nothing" (see `no_answer`).

## Request

```jsonc
{
  "query": "What is my attendance and the minimum requirement?",
  "conversation_id": "uuid",            // Node's id; for logging only, you keep no state
  "org_id": "bennett-university",
  "student_context": {                  // the LOGGED-IN student's own record, or null
    "program": "B.Tech CSE",
    "semester": 5,
    "attendance_percent": 87,
    "fee_balance": 0,
    "hostel_room": "C-204"
  },
  "conversation_history": [             // previous turns only, NOT the current query
    { "role": "user", "text": "..." }, { "role": "assistant", "text": "..." }
  ],
  "mode": "fresh",                      // fresh | follow_up_bias | clarification_answer
  "candidate_domains": null,            // clarification_answer: ids you offered, e.g. ["fees","examination"]
  "original_query": null,               // clarification_answer: the question that triggered it
  "bias_domain": null,                  // follow_up_bias: the previous domain id
  "bias_amount": null                   // follow_up_bias: 0.1 (nudge, not a force)
}
```

**Modes.** `fresh`: classify normally. `follow_up_bias`: the previous turn was
answered in `bias_domain`; add `bias_amount` to that domain's score so short follow-ups
("what about hostel students?") don't re-route at random. `clarification_answer`: your
last reply was a clarification; `query` is the student's choice (often one word). Answer
`original_query` within the chosen domain. Don't ask again.

**`student_context`.** Exactly these five fields, nothing else about the student.
Use the values **exactly as given**. Never estimate, round or invent them. If a
field is `null`, say it isn't available. Use them only to write this one answer
and never store or log them. The values are fixed demo data.

## Response

One JSON object. `decision` says which shape it is.

```jsonc
// 1. Normal answer
{ "decision": "answer", "domain": "Fees & Finance", "confidence": 0.91,
  "answer": "...", "sources": [{ "document": "fee_policy.pdf", "section": "Due Dates", "score": 0.79 }],
  "domain_scores": { "Fees & Finance": 0.91, "Registration": 0.12 },   // optional, enables the routing margin
  "used_student_context": false }

// 2. Answer built from student_context (set the flag, see below)
{ "decision": "answer", "domain": "Academics", "confidence": 0.9, "answer": "Your attendance is 87%.",
  "sources": [], "used_student_context": true }

// 3. Two clear, separate questions: one entry per domain
{ "decision": "multi_answer", "answers": [
    { "domain": "Fees & Finance", "answer": "...", "confidence": 0.85, "sources": [...] },
    { "domain": "Career Services", "answer": "...", "confidence": 0.8, "sources": [...] } ] }

// 4. Genuinely unsure which domain was meant
{ "decision": "clarification", "message": "Which deadline do you mean, fees or exams?",
  "clarification_options": ["Fees & Finance", "Academics"] }

// 5. Domain is clear but retrieval found nothing relevant: DON'T invent an answer
{ "decision": "no_answer", "domain": "Fees & Finance", "no_answer": true }

// 6. Greeting / thanks / chit-chat (optional "answer" text; Node has a default)
{ "decision": "greeting", "domain": "General", "answer": "Hello! How can I help?" }

// 7. Rare: you decide a human must take over
{ "decision": "handoff", "handoff_reason": "user_requested_human", "message": "..." }
```

**Deciding between `multi_answer` and `clarification`** is your call (Node does not guess):
two clearly different questions → `multi_answer`; one unclear question that could belong to
two domains → `clarification`. Don't infer it from the word "and" alone.

**`used_student_context: true`** matters: a personal question like "which semester am I in"
is usually labeled Registration or General, which are outside our five domains, and Node
would normally reply "outside my scope". With this flag set, Node passes your answer through.
Set it whenever the answer uses `student_context`.

**Domains.** Use either our ids (`fees`, `examination`, `it`, `facilities`, `career_services`)
or your labels; Node maps both. Current mapping (`src/config/domains.js`):

| Our domain | Accepted labels |
|---|---|
| `fees` | Fees & Finance |
| `examination` | Academics |
| `facilities` | Facilities, Housing |
| `career_services` | Career Services |
| `it` | IT Helpdesk & Tech Support, IT (**not in the trained model yet**) |

Any other label (Registration, Admissions, Student Life, Health & Wellness, Disciplinary,
International) is outside scope: the student gets a polite "outside my scope" reply, no ticket.
`General` gets a friendly greeting reply.

**Accepted aliases** (so you can keep your current names): `answer` or `response`;
`confidence`, `routing_score` or `routingScore`; `clarification_options`, `candidate_domains`
or `candidateDomains`; `margin`, `routing_margin` or `routingMargin`. `sources` may be strings
or objects (`document`/`title`/`source`/`name`, `section`, `score`, `url`, `chunk_id`).

**Your current format works too.** Without `decision`, Node reads `needs_clarification`
(→ clarification), an `answers` list (→ multi_answer), or `response` (→ answer). Fields like
`is_complex` and `orchestration_logs` are ignored. What you lose in that mode: no
`multi_answer` unless you send `answers[]`, no `no_answer`, and a personal answer labeled outside our five domains is rejected as out-of-scope (no `used_student_context` flag to rescue it).

## What Node does around your reply

- Blocks personal data we don't hold (results, marks, grades, CGPA, roll number) **before**
  calling you, so you never see those questions.
- Temporary: IT questions (wifi, password reset, LMS/email login...) go to human handoff by
  keyword until the model has an IT label. Switch off with `IT_KEYWORD_RULE=false`.
- Drops domains the organization hasn't enabled; merges two labels of one domain (Facilities + Housing).
- `no_answer: true` → "I couldn't find verified information... contact {department}" (Fees,
  Examination, IT, Estate & Facilities, Placement Cell). With `REQUIRE_SOURCES=true`, an answer with an
  empty `sources` list is treated the same way.
- Multi-domain: one answer with each domain's part on its own line, per-domain `answers[]`
  with their sources kept.

## Checklist for the AI team

Must:
1. Serve `POST /api/v1/chat` and `GET /api/v1/health` with the request/response above.
2. Return `decision` and the matching shape.
3. Add an **IT** label to the classifier (Examination can stay mapped to Academics).
4. Use `student_context` exactly and set `used_student_context`. Add a prompt rule and a test for it.
5. Be stateless: remove the PostgreSQL layer, Redis and per-conversation storage.
6. Return `no_answer` when retrieval finds nothing relevant. Never invent policy.
7. Return real `sources` for grounded answers.

Should:
8. Honour `mode`, `candidate_domains`, `original_query`, `bias_domain`, `bias_amount`.
9. Return `domain_scores` for all domains (Node computes the routing margin from it).
10. Answer per domain for `multi_answer`.
11. Return `decision: "greeting"` for chit-chat.
12. Ingest the knowledge base into MongoDB Atlas Vector Search (index `vector_index`, field `embedding`,
    384 dims, cosine) instead of Qdrant, and make sure the BM25 index is actually built.

## Try it without the AI team's code

`npm run mock:ai` starts a stand-in service on :8000 that speaks this contract (placeholder
answers). Then `USE_MOCK_AI=false npm run dev` exercises the real HTTP path.
