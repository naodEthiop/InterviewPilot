# InterviewPilot
<<<<<<< HEAD
=======

AI-powered interview simulation platform. Practice realistic interviews with **Captain** (Interviewer Agent), get scored by the **Evaluator Agent**, and receive a full **Report Agent** debrief — all powered by the **Cursor SDK**.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Hono, Node.js, TypeScript |
| AI | Cursor SDK (`@cursor/sdk`) — Captain, Evaluator, Report agents |
| Database | Supabase (PostgreSQL + Auth) |

## Features (MVP)

- Email/password auth (Supabase)
- Start adaptive interview sessions
- Captain asks up to 5 questions (adapts to your answers)
- Evaluator scores each answer in real time
- Report Agent generates final feedback
- Interview history on dashboard

## Project structure

```
├── src/                    # Backend API
│   ├── agents/             # Cursor SDK agents (Captain, Evaluator, Report)
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── db/
│   └── types/
├── frontend/               # Next.js App Router
├── supabase/migrations/    # Database schema + RLS
└── docs: ARCHITECTURE.md, API.md, ENV.md, DEPLOYMENT.md
```

## Quick start

### 1. Prerequisites

- Node.js 20+
- [Cursor API key](https://cursor.com/dashboard/cloud-agents)
- Supabase project (see `.cursor/mcp.json` or create one)

### 2. Environment

`.env` and `frontend/.env.local` are pre-configured for Supabase project `ivoyhrmpojvyersxbmoo`.

**You must set your Cursor API key** in `.env`:

```bash
CURSOR_API_KEY=cursor_your_key_here   # https://cursor.com/dashboard/cloud-agents
```

### 3. Database

**Already applied via Supabase MCP:**

- `initial_schema` — profiles, interviews, questions, answers, reports + RLS
- `revoke_handle_new_user_execute` — security hardening

Tables: `profiles`, `interviews`, `questions`, `answers`, `reports` (all RLS enabled).

### 4. Install & run

```bash
npm install
npm run dev
```

- API: http://localhost:3001
- Web: http://localhost:3000

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/interview/start` | Start session + first question |
| POST | `/interview/answer` | Submit answer, evaluate, next question |
| POST | `/interview/end` | End session + generate report |
| GET | `/interview/history` | List past interviews |
| GET | `/interview/:id` | Interview detail |
| GET | `/interview/stream/captain` | SSE stream (Captain) |
| GET | `/interview/stream/report` | SSE stream (Report) |

See [API.md](./API.md) for request/response shapes.

## Demo flow

1. Sign up / sign in
2. **New Interview** → pick role → Start with Captain
3. Answer questions; see Evaluator feedback after each
4. End interview or complete 5 questions → view Report

## Screenshots

<!-- Add screenshots here after first run -->

## License

MIT — hackathon project
>>>>>>> ae38fdb56f8fcb783e03d1c50d9d9bdd239f7368
