# Campus Assistant Backend

Node/Express/MongoDB backend for the "One Front Door" campus assistant. It owns
authentication, the student record, conversations and turns, tickets, feedback,
evaluation data and the API the frontend uses. **MongoDB is the only
application database.** The AI service (FastAPI: classifier, RAG, LLM) is a
stateless processing service behind `src/services/aiService.js`.

```
Frontend -> Node/Express (auth, student record, MongoDB) -> FastAPI AI service -> answer + sources
```

Supported domains: **fees, examination, it, facilities, career_services.**
The AI contract, with the full request/response spec and a checklist for the
AI team, is in [`docs/AI_CONTRACT.md`](docs/AI_CONTRACT.md).

## Run it

```bash
npm install
cp .env.example .env        # then edit .env
npm run seed:students       # once: the 2 demo students
npm run dev                 # http://localhost:5000, check /health
```

In `.env`, set `MONGO_URI` (Atlas string: no `< >` brackets, URL-encode special
characters in the password) and `ADMIN_API_KEY`. Leave `USE_MOCK_AI=true` until
the AI team's service is up.

Demo logins (both password `demoPass123`): `aryan.sharma@demo.camu.edu`,
`priya.verma@demo.camu.edu`. Their profile (program, semester, attendance, fee
balance, hostel room) is **fixed demo data**. New signups get the same defaults.

### Three ways to run the AI side

| Mode | Setting | Use it for |
|---|---|---|
| Built-in mock | `USE_MOCK_AI=true` | Day-to-day development, frontend work |
| Mock over HTTP | `npm run mock:ai` + `USE_MOCK_AI=false` | Exercise the real HTTP path with no AI team code |
| Real AI service | `USE_MOCK_AI=false`, `AI_SERVICE_URL=http://<host>:8000/api/v1/chat` | Integration. `GET /health/ai` shows whether it is reachable |

The mock's answer text is placeholder, not university policy.

## Tests

```bash
npm test                 # guardrail + adapter + full chat flow; needs no DB, no server, no network
npm run test:queries     # smoke test against a RUNNING server (needs MongoDB + seeded students)
```

`npm test` runs the real Express app and the real HTTP call to the mock AI
service, with the Mongoose models stubbed in memory.

## What happens to a chat message

1. **Auth + ownership.** The student comes from the JWT, never the body. A conversation can only be continued by its owner, in their own org.
2. **Results / marks / grades / CGPA / roll number:** fixed "check the CAMU portal" reply, AI not called. (We hold no such data.)
3. **IT question** (temporary keyword rule: wifi, password reset, LMS/email login...): handoff + ticket, AI not called. Set `IT_KEYWORD_RULE=false` once the model has an IT label.
4. **Otherwise the AI is called** with the question, conversation history, clarification/follow-up context and the student's own record (`student_context`: program, semester, attendance, fee balance, hostel room, nothing else).
5. **The reply is normalized** to one shape (see below): AI labels mapped to our five domains (Housing counts as facilities, Academics as examination); labels outside the five get a polite "outside my scope" reply (no ticket); greetings get a friendly reply; "nothing found" names the department (Fees, Examination, IT, Estate & Facilities, Placement Cell); two clear questions become one answer with a line per domain.
6. **Persisted** in MongoDB (`Turn`: decision, domains, answers + sources, reply kind, handoff reason, request id, AI latency; never the student's record). A handoff also creates a ticket.

If the AI is down, slow, returns an error or malformed JSON, the student gets a controlled handoff reply plus a ticket, and the server stays healthy.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | none (failed attempts rate-limited) | `{ token, student }` |
| GET | `/api/student/profile` | Bearer | The logged-in student's demo dashboard data |
| POST | `/api/chat` | Bearer | `{ message, conversationId? }` |
| GET | `/api/conversations/:id` | Bearer, owner only | Turn history |
| POST | `/api/feedback` | Bearer, own turns only | `{ turnId, feedback: "up"\|"down" }` |
| GET | `/api/domains` | Bearer | Org's enabled domains + department per domain |
| GET | `/api/tickets`, `/api/evaluation` | `x-admin-key` header | Handoff tickets; routing accuracy + behaviour stats |
| GET | `/health`, `/health/ai` | none | Backend / AI service status |

Errors use `{ error, message }` with codes `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `internal_error`.

### `/api/chat` response (frontend contract)

Every response has `conversationId`, `turnId` and a `type`:

```jsonc
// type: "answer"  (normal answers and special replies)
{ "type": "answer", "answer": "...", "domain": "fees", "routingScore": 0.91,
  "sources": [{ "document": "fee_policy.pdf", "section": "Due Dates", "score": 0.79 }],
  "replyKind": "greeting" }   // replyKind only on special replies, domain is null for them:
                              // "out_of_scope" | "greeting" | "no_answer" | "personal_data_unavailable"

// type: "multi_answer"  (answer = one text, each domain's part on its own line)
{ "type": "multi_answer", "answer": "...\n\n...", "domains": ["fees", "career_services"],
  "answers": [{ "domain": "fees", "answer": "...", "routingScore": 0.85, "sources": [] }, ...] }

// type: "clarification"  (the student's next message is treated as the choice)
{ "type": "clarification", "message": "Which area do you mean?", "candidateDomains": ["fees", "examination"] }

// type: "handoff"  (a ticket was created)
{ "type": "handoff", "reason": "it_keyword_rule", "message": "...", "ticketId": "..." }
// reasons: it_keyword_rule | ai_unavailable | ai_timeout | ai_http_error | ai_malformed_response | (AI-supplied)
```

Personal questions answered from the student's record (e.g. "what is my
attendance?") come back as a normal `answer`. The AI contract (`used_student_context`)
explains how the AI marks them.

## Configuration

See `.env.example` (every variable is commented). Notable: `ADMIN_API_KEY`
(without it `/api/tickets` and `/api/evaluation` return 503), `JWT_SECRET`
(required, non-default, when `NODE_ENV` is not development/test),
`AI_SERVICE_TIMEOUT_MS` (default 30 s; a local LLM can be slow),
`REQUIRE_SOURCES` (treat source-less answers as "nothing found"; turn on once
the AI reliably returns sources), `CORS_ORIGIN` (the frontend's origin; empty
allows all, dev only), `TRUST_PROXY=1` behind Render/Railway.

## Still open

- **AI team:** the checklist at the end of `docs/AI_CONTRACT.md` (IT label, `student_context`, explicit decisions, `no_answer`, stateless, ingestion into MongoDB Atlas Vector Search). Until then the real service is accepted in its current format with reduced behaviour (see the contract).
- **Frontend team:** sign off the response shapes above and set `CORS_ORIGIN`.
- **Department contacts:** replies name the department only. Add real emails/phones in `src/config/domains.js` (`DEPARTMENTS`) if you have them.
- **Deployment:** laptop or hosted is undecided.
- One seeded organization; `enabledDomains` is set to the five domains and used to reject any other domain.
- Known limits: the IT keyword rule handles a whole message, so "hostel allotment and wifi" goes to handoff without answering the hostel part; the results/marks filter also catches "how is my CGPA calculated".
