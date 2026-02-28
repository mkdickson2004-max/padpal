# PadPal — Local Setup Guide

Goal: get PadPal running locally with Supabase auth (Google OAuth via Supabase), database schema, and a working Next.js dev server.

Audience: web developers who haven’t used Supabase or Google OAuth before.

---

## 0) Prerequisites

- Node.js 18+ and npm 9+
  - Verify: `node -v` and `npm -v`
- Accounts:
  - GitHub (for Vercel deploy later)
  - Supabase account: https://supabase.com
  - Google Cloud account: https://console.cloud.google.com (to create OAuth credentials used by Supabase)

Optional (for AI features not yet wired into the app UI):
- OpenAI account + API key: https://platform.openai.com/ (store the key for later)

---

## 1) Clone and install

```bash
# From your dev folder
cd padpal/my-app
npm install
```

---

## 2) Create Supabase project

1) Go to https://supabase.com → Sign in → New project
2) Choose organization and project name (e.g., "PadPal Dev")
3) Pick a strong database password (store it in your password manager)
4) Wait for provisioning to complete

You’ll need 2 values from the project settings shortly:
- Project URL (a.k.a. Supabase URL)
- anon public key (a.k.a. anon key)

Find them in: Project Settings → API.

---

## 3) Configure Supabase Auth (Google OAuth)

PadPal uses Supabase Auth. We enable Google as a provider inside Supabase and let Supabase handle the OAuth flow. No GOOGLE_* variables are needed in the app code.

A) Set Site URL and redirect
- In Supabase Dashboard → Authentication → URL Configuration:
  - Site URL: `http://localhost:3000`
  - Redirect URLs: add `http://localhost:3000/auth/callback`

B) Enable Google provider
- Authentication → Providers → Google → Configure
- In a separate tab, create OAuth creds in Google Cloud:
  1. https://console.cloud.google.com → Select or create a project
  2. APIs & Services → OAuth consent screen
     - User type: External (for testing) → Configure
     - App name: "PadPal Dev" (or similar)
     - Add your email; scopes can stay default for now
     - Add test users (your Google account) so you can sign in
     - Save/publish as needed
  3. APIs & Services → Credentials → Create Credentials → OAuth client ID
     - Application type: Web application
     - Name: "PadPal Local"
     - Authorized redirect URIs: add `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
       - Tip: Copy the exact redirect URI shown by Supabase in the Google provider config panel.
  4. Copy the Client ID and Client Secret back into Supabase’s Google provider settings and Save.

C) Test the provider in Supabase
- In Authentication → Providers → Google, ensure status is Enabled.

Notes
- The app’s OAuth callback handler is at `/auth/callback` and exchanges the Supabase auth code for a session (see `src/app/auth/callback/route.ts`).
- Supabase itself calls Google’s OAuth callback; you do NOT need GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in `.env.local` for this app.

---

## 4) Create the database schema

Run the provided SQL scripts in order.

1) Supabase Dashboard → SQL Editor → New query
2) Paste and run the contents of:
   - `supabase/schema.sql`
   - then `supabase/triggers.sql`

Location in repo:
- `padpal/my-app/supabase/schema.sql`
- `padpal/my-app/supabase/triggers.sql`

What this does
- Creates tables: users, houses, memberships, tasks, bills, bill_splits, leaderboard_entries, activity_log
- Sets RLS policies so members can see their own house data
- Adds a trigger to auto-create a public.users row when a new auth user signs up

Optional: Storage bucket for photos
- If you plan to use photo uploads soon, create a Storage bucket in Supabase (e.g., `proofs`) and configure public/secured policies as needed.

---

## 5) Environment variables (local)

Create `padpal/my-app/.env.local` with the following:

```
# Required (from Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: If you’ll run server-side admin scripts later
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Future AI features
# OPENAI_API_KEY=sk-...
```

Explanation
- `NEXT_PUBLIC_*` keys are safe for client-side use and required by `@supabase/supabase-js`
- `SUPABASE_SERVICE_ROLE_KEY` is powerful; never expose it to the browser. Not used by the app at runtime, only for admin jobs.
- `OPENAI_API_KEY` is not wired in current UI; include it only if you add AI verification locally.

Remove stale variables
- Older docs might mention `NEXTAUTH_URL` and `NEXTAUTH_SECRET` or `GOOGLE_CLIENT_ID/SECRET`. They are NOT needed for this Supabase-auth-based app.

---

## 6) Run the app locally

```bash
npm run dev
# Dev server: http://localhost:3000
```

Sign in
- Visit http://localhost:3000 and use the Sign in flow
- On success, you should be redirected to `/dashboard`

Troubleshooting
- If auth redirects back to home, re-check Supabase Authentication → URL Configuration and the Google provider redirect URI in Google Cloud.
- In your browser dev tools, check network requests to `/auth/v1/authorize` and `/auth/callback` for clues.

---

## 7) What to commit / keep secret

- Commit: code, SQL files, and non-secret configs
- Do NOT commit: `.env.local`, any service role keys, or API secrets

You’re set. Continue to `DEPLOY.md` for Vercel deployment.
