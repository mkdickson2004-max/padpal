# PadPal — Testing Checklist

Purpose: Quick end-to-end sanity checks for local and production.

---

## 1) Authentication & Session

- [ ] Landing page loads without errors
- [ ] Click Sign in → Google OAuth prompt appears
- [ ] Sign in with a test Google account (added as Test User in Google Cloud if using unpublished app)
- [ ] Redirect back to app; session cookie is set
- [ ] Visiting /dashboard without a session redirects to home (middleware guard)

Common issues & fixes
- Google sign-in loops back to home
  - Check Supabase → Auth → URL Configuration (Site URL + Redirect)
  - Check Google Cloud OAuth redirect URI matches what Supabase shows
  - In dev, ensure app runs on `http://localhost:3000`
- 401/403 when querying data
  - Confirm RLS policies were applied (run `supabase/schema.sql` again)
  - Ensure the user belongs to the target house (memberships row exists)

---

## 2) Database & RLS

- [ ] New user appears in `public.users` after first sign-in (trigger works)
- [ ] Create a house (via UI if available) → row exists in `public.houses`
- [ ] Add membership → current user can see their house and related tasks
- [ ] Try accessing another house’s data (if you can simulate) → access denied by RLS

Common issues & fixes
- Users not auto-created
  - Re-run `supabase/triggers.sql` to recreate `on_auth_user_created` trigger
  - Check function `public.handle_new_user`
- Can’t read own data
  - Verify membership exists for this user/house
  - Inspect RLS policies in `schema.sql`

---

## 3) Tasks & Leaderboard flows

- [ ] Create a task (chore/supply/party/bill)
- [ ] Verify default status is `pending`
- [ ] Confirm task appears in UI for all house members
- [ ] Adjust status to `verified` (admin flow, if present) and see leaderboard points update (if UI wired)

Common issues & fixes
- Writes blocked
  - Ensure the insert policy for `tasks` exists (see `schema.sql`)
- Leaderboard not updating
  - Current schema stores entries directly; if you expect computed views or cron jobs, verify those exist in your implementation

---

## 4) Bills & Splits

- [ ] Create a bill and associated `bill_splits`
- [ ] Verify each member sees their split and Venmo link (if present)

Common issues & fixes
- Unique constraint errors on `bill_splits`
  - Each user can only have one split per bill; adjust test data accordingly

---

## 5) Production-specific checks (Vercel)

- [ ] Environment variables set in Vercel (see `DEPLOY.md`)
- [ ] Supabase Auth Site/Redirect URLs updated to production domain
- [ ] Google Cloud OAuth client updated for production domain if necessary
- [ ] Sign-in works end-to-end in production

---

## 6) Optional AI verification

If you wire up AI-based photo verification:
- [ ] `OPENAI_API_KEY` is present in the environment (server-side only)
- [ ] Uploading a photo invokes the verification endpoint
- [ ] Confidence/decision stored on the task

Common issues & fixes
- 401 to OpenAI
  - Key missing or in the wrong environment
- Large image failures
  - Add reasonable upload limits and resize client-side before sending

---

## 7) Regression smoke list

- [ ] Sign-in/out stability across refreshes
- [ ] Deep links to `/dashboard` and `/house/:id` honored with auth guard
- [ ] Basic navigation works without full reloads
- [ ] No PII or secrets logged to console
- [ ] Accessibility basics: can tab through main flows

That’s it. Use this as a pre-merge and pre-release gate.
