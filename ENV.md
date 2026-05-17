# Environment Variables

## Root `.env` (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default `3001`) |
| `NODE_ENV` | No | `development` \| `production` |
| `CORS_ORIGIN` | No | Frontend URL (default `http://localhost:3000`) |
| `CURSOR_API_KEY` | **Yes** | Cursor API key for SDK agents |
| `CURSOR_MODEL_ID` | No | Model id (default `composer-2`) |
| `SUPABASE_URL` | **Yes** | Project URL |
| `SUPABASE_ANON_KEY` | **Yes** | Anon key (JWT validation + user-scoped DB via RLS) |

## `frontend/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Same as `SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend URL (e.g. `http://localhost:3001`) |

## Getting keys

1. **Cursor**: [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)
2. **Supabase**: Project Settings → API

Never commit `.env` or `.env.local`. Never expose `CURSOR_API_KEY` to the browser.
