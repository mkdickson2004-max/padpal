# PadPal — Deployment Guide (Vercel)

This guide deploys PadPal to Vercel using Supabase for auth/database. You’ll connect your GitHub repo, set env vars, and verify auth.

Prereqs
- Complete local setup in `SETUP.md`
- Code pushed to a GitHub repository
- Supabase project ready with Google provider enabled

---

## 1) Import to Vercel

1) Go to https://vercel.com → New Project → Import your GitHub repo
2) Framework Preset: Next.js (auto-detected)
3) Root directory: the folder containing `package.json` (here: `padpal/my-app` if you import the monorepo root, otherwise import `my-app` directly)
4) Build settings: defaults are fine
   - Build Command: `next build`
   - Install Command: `npm install`
   - Output Directory: `.vercel/output` (Next auto)

---

## 2) Environment variables (Vercel)

Add the same variables you used locally (Project Settings → Environment Variables), for the Production environment:

Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional
- `SUPABASE_SERVICE_ROLE_KEY` (do NOT expose to client functions; use only in secure server contexts)
- `OPENAI_API_KEY` (only if you wire up AI features)

Tip: Use Vercel’s “Import from .env.local” feature if you have it handy, then remove any unused entries before saving.

---

## 3) Supabase Auth URLs for production

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: your production URL from Vercel, e.g., `https://padpal-yourname.vercel.app`
- Redirect URLs: add `https://padpal-yourname.vercel.app/auth/callback`

Google Provider (Supabase → Auth → Providers → Google)
- If needed, add your production domain to the OAuth client in Google Cloud or create a second OAuth client for production
- Make sure the redirect URI in Google Cloud matches the one Supabase shows for Google provider

---

## 4) Custom domain (optional)

1) In Vercel → Project → Settings → Domains → Add
2) Add your custom domain (e.g., `padpal.house`)
3) Follow Vercel’s DNS instructions (typically set `A` or `CNAME` records)
4) After DNS propagates, update Supabase Auth URLs accordingly:
   - Site URL: `https://padpal.house`
   - Redirect: `https://padpal.house/auth/callback`

---

## 5) Deploy

- Trigger a deploy by pushing to your default branch, or click Deploy in Vercel
- Wait for build to finish

Post-deploy checks
- Open the production URL
- Run the sign-in flow (Google)
- On success, you should land on `/dashboard`

---

## 6) Environment promotion and previews

- In Vercel, also set variables for “Preview” if you want preview deployments to work with auth.
- For previews, you can typically reuse the same Supabase project; add the preview domain(s) to Supabase’s Redirect URLs as well.

Security notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code or public logs.
- Use Vercel Environment Variable scoping (Production / Preview / Development) to keep values isolated.

You’re live. See `TESTING.md` for end-to-end checks.
