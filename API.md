# InterviewPilot API

Base URL: `http://localhost:3001` (dev)

All `/interview/*` routes require:

```
Authorization: Bearer <supabase_access_token>
```

## Response format

**Success:**

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

**Error:**

```json
{
  "success": false,
  "error": "message"
}
```

---

## POST `/interview/start`

Start a new interview. Captain generates the first question.

**Body:**

```json
{
  "role": "Software Engineer",
  "title": "Optional session title"
}
```

**Response `data`:**

```json
{
  "interview": { "id": "uuid", "role": "...", "status": "in_progress", ... },
  "question": { "id": "uuid", "text": "...", "sequence": 1, "focus_area": "..." }
}
```

---

## POST `/interview/answer`

Submit an answer. Evaluator scores it; Captain may return the next question.

**Body:**

```json
{
  "interviewId": "uuid",
  "answer": "Your answer text"
}
```

**Response `data`:**

```json
{
  "evaluation": {
    "score": 7,
    "strengths": [],
    "weaknesses": [],
    "feedback": "...",
    "clarity": 8,
    "depth": 6,
    "relevance": 7
  },
  "nextQuestion": { "id": "uuid", "text": "..." } | null,
  "interview": { ... }
}
```

When `nextQuestion` is `null`, the session has reached the question limit — call `/interview/end`.

---

## POST `/interview/end`

End interview and generate report via Report Agent.

**Body:**

```json
{
  "interviewId": "uuid"
}
```

**Response `data`:**

```json
{
  "interview": { "status": "completed", ... },
  "report": {
    "summary": "...",
    "overall_score": 7.5,
    "strengths": [],
    "weaknesses": [],
    "recommendations": [],
    "full_report": {}
  }
}
```

---

## GET `/interview/history`

List user's interviews with optional report summary.

**Response `data`:**

```json
{
  "interviews": [
    {
      "id": "uuid",
      "title": "...",
      "role": "...",
      "status": "completed",
      "report": { "overall_score": 8, "summary": "..." }
    }
  ]
}
```

---

## GET `/interview/:id`

Full interview detail: questions, answers, report.

---

## GET `/interview/stream/captain?interviewId=uuid`

Server-Sent Events stream of Captain generating a question (demo).

Events: `start`, `chunk`, `complete`, `error`

---

## GET `/interview/stream/report?interviewId=uuid`

SSE stream of Report Agent output.

---

## GET `/health`

Public health check (no auth).
