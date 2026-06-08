# Deployment & Handoff — Jilbab Store

> **Audience:** the next engineer or AI agent picking up this project.
> **Last updated:** 2026-06-08
> **Stack:** Next.js 16 (App Router, React 19) · Firebase (Firestore + Auth) · Vercel hosting

This file is the single source of truth for **how this app deploys** and **what
state it's in**. Read it top to bottom before touching deploys.

---

## 1. TL;DR — how deploys work

Deployment is **GitHub → Vercel, automatic on push**:

| You push to…             | Vercel builds…                  | Result |
|--------------------------|----------------------------------|--------|
| any branch / PR          | a **Preview** deployment         | private URL, safe to test |
| `main` (default branch)  | the **Production** deployment    | **goes live** at the production domain |

There is **no manual deploy step** once Vercel is connected — `git push` is the deploy.
Build command is `npm run build` (see `vercel.json`).

- **GitHub repo:** `https://github.com/jafar-spec/jilbabstore` (⚠️ **PUBLIC**)
- **Vercel project:** `jilbabstore` (already linked — see `.vercel/project.json`, git-ignored)
- **Production domain:** `https://jilbab.store`
- **Firebase project:** `jilbab-store`

> ⚠️ **Two Vercel projects are connected to this repo:** `jilbabstore` **and**
> `jilbabstore-464d`. Both build & deploy on every push (confirmed via PR #1).
> This is almost certainly an accidental duplicate. Decide which one owns the
> `jilbab.store` domain and **delete/disconnect the other** to avoid double builds
> and confusion (Vercel → the redundant project → Settings → Delete). Until then,
> make sure env vars are set on **whichever project serves production**.

> The repo also still contains a legacy Firebase App Hosting deploy script
> (`npm run deploy` in `package.json`). **Ignore it** — we deploy via Vercel now.
> It's left in place only so nothing breaks; remove it if you want to fully cut over.

---

## 2. First-time setup (only if Vercel is NOT already connected)

A Vercel project is already linked locally, and the prod env contained
`VERCEL_GIT_*` variables, which means **GitHub↔Vercel is almost certainly already
wired**. If a push does **not** trigger a build, connect it once:

1. Go to <https://vercel.com> → **Add New… → Project**.
2. **Import** `jafar-spec/jilbabstore` from GitHub.
3. Framework preset: **Next.js** (auto-detected). Build command `npm run build`,
   install `npm install` — already declared in `vercel.json`, leave defaults.
4. Add the **environment variables** (next section) for **Production** and **Preview**.
5. Deploy. Then add the custom domain `jilbab.store` under **Settings → Domains**.

---

## 3. Environment variables (CRITICAL)

All env vars are documented — names, grouping, required/optional — in
[`.env.example`](.env.example). Set them in **Vercel → Settings → Environment
Variables** for both **Production** and **Preview**.

**Must-have for the app to function:**
- `FIREBASE_SERVICE_ACCOUNT_KEY` — the full service-account JSON as one string.
  Powers every server route (orders, transitions, returns, cancel, cron). Without
  it, checkout and admin actions fail with "Server not configured".
- `NEXT_PUBLIC_FIREBASE_*` — client config (has fallbacks in `lib/firebase.js`, but set them).
- `NEXT_PUBLIC_SITE_URL` — e.g. `https://jilbab.store`.

**Strongly recommended:**
- `RESEND_API_KEY` + `EMAIL_FROM` — order/return/refund emails.
- `CRON_SECRET` — protects `/api/cron/*` (Vercel sends it automatically; see §5).
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — Firebase App Check (enforces Firestore security in prod).

**Optional (degrade gracefully):** Twilio (SMS), Algolia (search), GA/Sentry,
PayPal, card-gateway vars. See `.env.example` for the full list.

> 💡 The repo already had `.env.vercel` / `.env.vercel.prod` (git-ignored) pulled
> from Vercel — a snapshot of what was set. Use them as a reference, but the
> **live source of truth is the Vercel dashboard**.

---

## 4. 🔐 Secrets — read this, the repo is PUBLIC

`.gitignore` now blocks the dangerous files, **verified with `git check-ignore`**:

- `Jilbab Store misc/` — **contains a Firebase Admin service-account private key**
  (`jilbab-store-firebase-adminsdk-*.json`) and Firestore data dumps. NEVER commit.
- `twilio_2FA_recovery_code.txt`, `*recovery*.txt`
- `.env*` (except this allowed `.env.example`)
- `*adminsdk*.json`, `*serviceAccount*.json`
- `.vercel/`, `grand-opening/` (8 MB marketing assets, not needed for the build)

**Before any commit, run:**
```bash
git status --porcelain | grep '^??'      # should show ONLY source code
git check-ignore "Jilbab Store misc/jilbab-store-firebase-adminsdk-fbsvc-8cb8e7dfaf.json"  # must print the path = ignored
```

⚠️ **If that service-account key was ever pushed** (it wasn't, as of this writing —
git history is clean), you must **rotate it immediately** in the Firebase console.

---

## 5. Cron jobs — ⚠️ plan gotcha

`vercel.json` defines two Vercel Cron jobs:
```json
"crons": [
  { "path": "/api/cron/restock",        "schedule": "0 */3 * * *" },  // every 3h
  { "path": "/api/cron/abandoned-cart", "schedule": "0 */6 * * *" }   // every 6h
]
```
- **Vercel Hobby plan allows daily crons only.** These sub-daily schedules require
  the **Pro plan**. On Hobby they will be rejected/limited — either upgrade, or
  change the schedules to once-daily (e.g. `0 8 * * *`).
- Set `CRON_SECRET`; Vercel sends it as `Authorization: Bearer <CRON_SECRET>` so the
  routes can reject non-Vercel callers.

---

## 6. Firestore rules & indexes

Security rules live in `firestore.rules`. They are **not** deployed by Vercel —
deploy them with the Firebase CLI when they change:
```bash
npm run deploy:rules        # firebase deploy --only firestore:rules --project jilbab-store
```
The current rules already support everything in the app (customer address book,
returns, cancellations all go through the Admin SDK or owner-scoped writes — **no
rules change was needed for the latest feature work**).

If the admin "stock movements" report ever errors about a missing index, create the
composite index Firestore suggests in the console (there's a code-side fallback, so
it won't crash).

---

## 7. Standard deploy workflow (day to day)

```bash
# 1. work on a branch
git checkout -b my-change
# 2. ...edit...
npm run build          # verify it compiles locally (Vercel runs the same)
# 3. push → Vercel builds a PREVIEW automatically
git push -u origin my-change
# 4. test the preview URL Vercel comments on the PR / shows in its dashboard
# 5. merge to main → Vercel builds & ships PRODUCTION
```

To **promote a preview to production**, merge the branch into `main` (PR or
fast-forward). Pushing straight to `main` also works and deploys prod immediately.

Rollback: in the Vercel dashboard → Deployments → pick a previous good one →
**Promote to Production** (instant, no rebuild).

---

## 8. Project state handoff (what's done / what's pending)

### Recently completed (2026-06-08 session) — all build-verified
A full feature sweep was implemented and `npm run build` passes:

1. **Address book** — saved delivery addresses on `customers/{uid}.addresses[]`,
   managed in `/profile`, prefilled + picker at checkout (`lib/db.js`,
   `app/profile/page.js`, `app/checkout/page.js`).
2. **Customer order cancellation** — `app/api/orders/cancel/route.js` (token-verified
   ownership, atomic stock release) + a Cancel button in `/profile`.
3. **Returns refund + restock** — `app/api/returns/process/route.js` (idempotent
   restock + refund recording) wired into the admin Returns queue.
4. **Admin sales reporting** — new "التقارير" tab: date-range KPIs, revenue trend,
   top products, payment/status breakdowns, CSV export (`app/admin/page.js`).
5. **SEO structured data** — Organization + WebSite (SearchAction) site-wide
   (`components/StructuredData.js` in `app/layout.js`) + Product/Breadcrumb JSON-LD
   on product pages.
6. **Promo minimum-order** — optional `minSubtotal` enforced in admin, checkout,
   `/api/validate-promo`, and authoritatively inside the order transaction.

### Known follow-ups / not done
- **Card payments are intentionally OFF** ("structure-ready"). The charge + webhook
  routes are clean provider-agnostic stubs. To go live: set `PAYMENT_PROVIDER` +
  gateway keys and implement `chargeWithProvider()` in
  `app/api/payments/charge/route.js`. CreditGuard (`CG_*`) creds exist in env but are
  not wired in code.
- **PayPal** is a simple `paypal.me` redirect — it does not verify payment before
  creating the order. Left as-is per product decision.
- **Web push notifications** — service worker/PWA scaffold exists (`public/sw.js`);
  web-push (VAPID) is not implemented.
- Lots of previously-uncommitted app code (shop, invoices, accessibility, etc.) is
  included in the commit that introduced this file — it had never been committed before.

### Verification status
- `npm run build` ✅ passes (homepage + product pages prerender; all API routes compile).
- Auth-gated interactive flows (address CRUD, cancel, returns, reports) are
  code-complete and build-verified but were **not** exercised against live Firestore
  in this session (no test credentials). Smoke-test them on the preview deploy.

---

## 9. Quick reference

```bash
npm install            # deps
npm run dev            # local dev (needs .env.local — copy from .env.example)
npm run build          # production build (what Vercel runs)
npm run lint           # eslint
npm run deploy:rules   # deploy Firestore security rules (Firebase CLI)
npm run test:e2e       # Playwright e2e
```

- Hosting: **Vercel** (auto-deploy from GitHub `main`)
- DB/Auth: **Firebase** project `jilbab-store`
- Email: **Resend** · SMS: **Twilio** · Search: **Algolia** (optional)
