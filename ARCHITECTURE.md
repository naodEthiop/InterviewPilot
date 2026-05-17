# InterviewPilot Architecture

## Overview

```
┌─────────────┐     REST + JWT      ┌─────────────┐     Cursor SDK     ┌──────────────┐
│  Next.js    │ ──────────────────► │  Hono API   │ ─────────────────► │ Local Agents │
│  Frontend   │                     │  (Node)     │                    │ Captain      │
└─────────────┘                     └──────┬──────┘                    │ Evaluator    │
       │                                   │                           │ Report       │
       │ Supabase Auth                     │ Service role              └──────────────┘
       ▼                                   ▼
┌─────────────┐                     ┌─────────────┐
│  Supabase   │ ◄────────────────── │  PostgreSQL │
│  Auth       │                     │  + RLS      │
└─────────────┘                     └─────────────┘
```

## Layers

### Frontend (`frontend/`)

- **App Router** pages: login, dashboard, new interview, session, report
- **Supabase client** for auth (browser + server)
- **API client** (`lib/api.ts`) calls backend with Bearer token

### Backend (`src/`)

| Layer | Responsibility |
|-------|----------------|
| `routes/` | HTTP routing, auth middleware |
| `controllers/` | Request validation (Zod), response formatting |
| `services/` | Business logic, DB orchestration |
| `agents/` | Cursor SDK prompts + JSON parsing |
| `db/` | Supabase service client |
| `middleware/` | JWT verification, error handling |

### Agents (Cursor SDK)

| Agent | File | Trigger |
|-------|------|---------|
| **Captain** | `agents/captain.ts` | Start interview, after each answer |
| **Evaluator** | `agents/evaluator.ts` | After each answer submitted |
| **Report** | `agents/report.ts` | Interview end |

All agents use `Agent.prompt()` for one-shot calls (auto-dispose). SSE endpoints use `Agent.create()` + `run.stream()` for live demo streaming.

### Interview flow

1. **Start** → insert `interviews` → Captain generates Q1 → insert `questions`
2. **Answer** → Evaluator scores → insert `answers` → Captain generates Qn (max 5)
3. **End** → Report Agent → insert `reports` → mark interview `completed`

## Security

- RLS on all tables; users only access own rows
- Backend uses **service role** for agent-driven writes (trusted server)
- JWT validated on every `/interview/*` route
- Production hides internal error details

## Design decisions

- **Hono over Express** — less boilerplate, native TypeScript
- **Service role on API** — simplifies agent orchestration; auth still gates routes
- **Structured JSON from agents** — predictable parsing, demo reliability
- **5 question cap** — keeps hackathon demos under ~3 minutes
