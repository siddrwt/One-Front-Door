# Frontend ↔ Backend API Contract

This document freezes the API contract for the frontend client. It specifies all endpoints, authentication, headers, request payloads, and the exact response shapes for the four chat interaction types (`answer`, `clarification`, `multi_answer`, and `handoff`).

---

## 1. Authentication & Tenant Security

- **Authentication Method:** JSON Web Token (JWT) in the `Authorization` header.
- **Tenant Context:** The tenant (`orgId`) and student identity (`studentId`) are extracted **exclusively from the verified JWT payload**.
- **No Duplicate Tenant Sources:** Client request bodies do not pass `orgId` or `studentId`. This eliminates cross-tenant data tampering or privilege escalation.

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-Id: <UUID> (optional: client-generated for distributed request tracing)
```

---

## 2. Core Endpoint: `POST /api/chat`

### Request Payload

```json
{
  "message": "When is the semester fee due?",
  "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | **Yes** | User query text (1–2000 characters). |
| `conversationId` | `string` \| `null` | No | Omit or pass `null` to initiate a new conversation. Pass the existing ID to continue a thread. |

---

## 3. The Four Response Types (`type`)

Every response from `POST /api/chat` returns HTTP `200 OK` and contains the base fields:
- `conversationId` (`string`): The conversation identifier.
- `turnId` (`string`): MongoDB ObjectId referencing the saved assistant turn.
- `type` (`string`): One of `"answer"`, `"clarification"`, `"multi_answer"`, `"handoff"`.

---

### Type 1: `answer`
Returned for direct grounded answers, personal student record answers, or controlled system replies.

#### Standard Grounded Policy Answer
```json
{
  "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0",
  "turnId": "65f8a9b2c3d4e5f6a7b8c9d1",
  "type": "answer",
  "answer": "The semester fee due date is published on the student portal under Fee Schedule; late payment attracts a fixed late fee as per policy.",
  "domain": "fees",
  "routingScore": 0.91,
  "routingMargin": 0.79,
  "sources": [
    {
      "document": "fee_policy.pdf",
      "section": "Due Dates",
      "score": 0.79
    }
  ]
}
```

#### Special Replies (`replyKind`)
When an answer is not a normal policy answer, `domain` is `null` and `replyKind` indicates the nature of the reply:
- `"greeting"`: Chit-chat or greetings.
- `"out_of_scope"`: Query belongs to a domain not supported by the university assistant.
- `"personal_data_unavailable"`: Student requested data we do not store (e.g. marks, CGPA, backlogs).
- `"security_override"`: Prompt-injection or system instruction override attempt blocked by security guardrails.
- `"no_answer"`: Policy domain recognized but no verified evidence found in knowledge base.

```json
{
  "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0",
  "turnId": "65f8a9b2c3d4e5f6a7b8c9d2",
  "type": "answer",
  "answer": "I don't have your results, marks or grades available here — please check them on the CAMU portal.",
  "domain": null,
  "routingScore": null,
  "routingMargin": null,
  "sources": [],
  "replyKind": "personal_data_unavailable"
}
```

---

### Type 2: `clarification`
Returned when a question is ambiguous and could belong to more than one domain.

```json
{
  "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0",
  "turnId": "65f8a9b2c3d4e5f6a7b8c9d3",
  "type": "clarification",
  "message": "Which area do you mean — fees or examinations?",
  "candidateDomains": [
    "fees",
    "examination"
  ],
  "candidateDomainScores": {
    "fees": 0.48,
    "examination": 0.44
  },
  "routingScore": 0.48,
  "routingMargin": 0.04
}
```

| Field | Type | Description |
|---|---|---|
| `message` | `string` | Prompt asking student to pick or clarify domain. |
| `candidateDomains` | `string[]` | List of canonical domain keys (`fees`, `examination`, `facilities`, `career_services`, `it`). |
| `candidateDomainScores` | `Record<string, number>` | Classification confidence scores for candidate domains (when available). |

---

### Type 3: `multi_answer`
Returned when the user query asks two or more distinct questions spanning different domains.

```json
{
  "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0",
  "turnId": "65f8a9b2c3d4e5f6a7b8c9d4",
  "type": "multi_answer",
  "answer": "The semester fee due date is published on the student portal under Fee Schedule; late payment attracts a fixed late fee as per policy.\n\nThe Placement Cell publishes drive schedules and eligibility criteria on the placement portal; internship registration opens each semester.",
  "domains": [
    "fees",
    "career_services"
  ],
  "routingScore": 0.9,
  "routingMargin": null,
  "answers": [
    {
      "domain": "fees",
      "answer": "The semester fee due date is published on the student portal under Fee Schedule; late payment attracts a fixed late fee as per policy.",
      "routingScore": 0.85,
      "routingMargin": null,
      "sources": [
        {
          "document": "fee_policy.pdf",
          "section": "Due Dates",
          "score": 0.79
        }
      ]
    },
    {
      "domain": "career_services",
      "answer": "The Placement Cell publishes drive schedules and eligibility criteria on the placement portal; internship registration opens each semester.",
      "routingScore": 0.8,
      "routingMargin": null,
      "sources": [
        {
          "document": "placement_guide.pdf",
          "section": "Drives",
          "score": 0.8
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `answer` | `string` | Combined answers separated by double newlines (`\n\n`). |
| `domains` | `string[]` | List of answered domain keys. |
| `answers` | `object[]` | Per-domain answer items with localized `domain`, `answer`, `routingScore`, `routingMargin`, and `sources`. |

---

### Type 4: `handoff`
Returned when an issue requires human staff intervention (e.g. IT support, AI outage, or user requested human).

```json
{
  "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0",
  "turnId": "65f8a9b2c3d4e5f6a7b8c9d5",
  "type": "handoff",
  "reason": "it_keyword_rule",
  "message": "This looks like an IT issue. I've logged a request so the IT team can follow up with you.",
  "ticketId": "t-1791192834-1"
}
```

| Field | Type | Description |
|---|---|---|
| `reason` | `string` | Reason code: `it_keyword_rule`, `ai_unavailable`, `ai_timeout`, `ai_http_error`, `ai_malformed_response`. |
| `message` | `string` | Student-facing explanation that a ticket was logged. |
| `ticketId` | `string` | The created tracking ticket ID. |

---

## 4. Other Frontend Endpoints

### Student Profile
`GET /api/student/profile`
- **Auth:** Bearer
- **Response:**
  ```json
  {
    "studentId": "student-1",
    "name": "Aryan Sharma",
    "orgId": "bennett-university",
    "program": "B.Tech CSE",
    "semester": 5,
    "attendancePercent": 87,
    "feeBalance": 0,
    "hostelRoom": "C-204"
  }
  ```

### Conversation History
`GET /api/conversations/:id`
- **Auth:** Bearer (owner only)
- **Response:**
  ```json
  {
    "conversationId": "65f8a9b2c3d4e5f6a7b8c9d0",
    "turns": [
      {
        "turnId": "...",
        "role": "user",
        "text": "When is the semester fee due?"
      },
      {
        "turnId": "...",
        "role": "assistant",
        "text": "The semester fee due date is...",
        "decisionType": "answer",
        "domains": ["fees"],
        "sources": [...]
      }
    ]
  }
  ```

### Turn Feedback
`POST /api/feedback`
- **Auth:** Bearer (owner of turn only)
- **Request:**
  ```json
  {
    "turnId": "65f8a9b2c3d4e5f6a7b8c9d1",
    "feedback": "down",
    "category": "wrong_routing",
    "comment": "This should have been examination."
  }
  ```
- **Categories:** `helpful`, `unhelpful`, `incorrect_answer`, `wrong_routing`, `missing_information`.
- **Response:**
  ```json
  {
    "turnId": "65f8a9b2c3d4e5f6a7b8c9d1",
    "feedback": "down",
    "category": "wrong_routing",
    "comment": "This should have been examination."
  }
  ```

### Domains
`GET /api/domains`
- **Auth:** Bearer
- **Response:**
  ```json
  {
    "orgId": "bennett-university",
    "enabledDomains": ["fees", "examination", "facilities", "career_services", "it"],
    "departments": {
      "fees": "Fees & Finance Department",
      "examination": "Examination Cell",
      "facilities": "Estate & Facilities Office",
      "career_services": "Placement Cell",
      "it": "IT Helpdesk"
    }
  }
  ```
