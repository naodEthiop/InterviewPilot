# Deployment

## Recommended setup

| Service | Host | Notes |
|---------|------|-------|
| Frontend | Vercel | Set `NEXT_PUBLIC_*` env vars |
| API | Railway / Fly / Render | Node 20+, expose port |
| Database | Supabase | Run migration, enable Auth |

## Backend deploy

1. Build: `npm run build:api`
2. Start: `node dist/index.js`
3. Set all variables from [ENV.md](./ENV.md)
4. Set `CORS_ORIGIN` to your Vercel URL
5. Ensure `CURSOR_API_KEY` is available (agents run on server)

**Note:** Cursor SDK local agents need a compatible runtime on the host. For production, consider Cursor cloud agents or ensure the deployment environment supports local agent execution.

## Frontend deploy

1. Connect repo to Vercel, root directory `frontend`
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
3. Deploy

## Supabase

1. Run `supabase/migrations/20260517000000_initial_schema.sql`
2. Enable Email auth provider
3. Add site URL + redirect URLs for your Vercel domain

## Health check

```
GET https://your-api.example.com/health
```

## Pre-demo checklist

- [ ] Migration applied
- [ ] Test user can sign up
- [ ] `CURSOR_API_KEY` valid
- [ ] Complete one full interview end-to-end
- [ ] CORS allows frontend origin
