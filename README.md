# PadPal

The House OS for Roommates — Track who's home, split bills automatically, complete chores with proof, and compete for MVP of the House.

## Features

- Who's Home — Geofence-based presence detection
- Auto Bills — Forward utility emails → Auto-split Venmo requests
- Chore Proof — Photo verification (AI-ready)
- MVP Leaderboard — Compete for house glory

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Auth, Database, Storage)
- Tailwind CSS
- Google OAuth (via Supabase)
- OpenAI (optional, for future AI verification)

## Quick Start

1) Install
```bash
cd padpal/my-app
npm install
```

2) Supabase
- Create a project at https://supabase.com
- SQL Editor → run `supabase/schema.sql`, then `supabase/triggers.sql`
- Auth → URL Configuration
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/callback`
- Auth → Providers → Google → Enable and configure (using Google Cloud OAuth)

3) Env vars (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# Optional (admin jobs only, never expose to client):
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# Optional (if you wire up AI locally):
# OPENAI_API_KEY=sk-...
```

4) Run
```bash
npm run dev
# http://localhost:3000
```

Full guides
- Local setup: SEE `SETUP.md`
- Deploy to Vercel: SEE `DEPLOY.md`
- Testing checklist: SEE `TESTING.md`

## Database Schema (overview)

- Houses — name, address, geofence, invite codes
- Memberships — links users to houses, roles
- Tasks — chores/supply/party/bill; photo + points + status
- Bills & Splits — total + per-user amounts, Venmo link
- Leaderboard — weekly/monthly scores per category

## Deploy

Recommended: Vercel. Import repo, add env vars, deploy.
See `DEPLOY.md` for details (including custom domains and auth URLs).

## Roadmap

- [x] Google OAuth
- [x] House creation/joining
- [x] Geofence presence
- [x] Chore logging
- [x] Leaderboard
- [ ] Photo upload + AI verification
- [ ] Email bill parsing
- [ ] Venmo deep link generation
- [ ] Push notifications
- [ ] Shareable cards for social

## License

MIT
