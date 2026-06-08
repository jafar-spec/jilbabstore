# Jilbab Store 🧕

A modern, multilingual (Arabic / Hebrew / English, RTL-aware) e-commerce store for
modest fashion — jilbabs, khimars, abayas. Built with **Next.js 16 (App Router)**,
**React 19**, and **Firebase**, deployed on **Vercel**.

## ✨ Features

- **Storefront:** shop browsing with faceted filters, search (Algolia + local
  fallback), product pages with reviews, wishlist, recently-viewed.
- **Cart & checkout:** server-authoritative order creation (recomputed totals,
  promo validation, atomic stock reservation), cash-on-delivery + PayPal + a
  structure-ready card layer.
- **Customer accounts:** email/password (+ verification) and phone-OTP auth, order
  history, **saved address book**, self-service **order cancellation** and
  **returns/refunds**, GDPR data export/delete.
- **Order ops:** order lifecycle + atomic stock state machine, courier portal with
  map routing, public order tracking, tax invoices (PDF) with barcodes.
- **Admin/CMS:** products, inventory + stock movements, purchase orders, sections,
  promo codes (with min-order), newsletter + SMS broadcast, support tickets,
  reviews, returns queue, editable pages, and a **sales reporting** dashboard.
- **Notifications:** transactional email (Resend), SMS (Twilio), abandoned-cart and
  back-in-stock crons.
- **Extras:** PWA/service worker, accessibility widget, SEO (sitemap, robots,
  Organization/WebSite/Product/Breadcrumb structured data), GA4 + cookie consent.

## 🚀 Local development

```bash
npm install
cp .env.example .env.local     # then fill in real values (see comments inside)
npm run dev                    # http://localhost:3000
```

Other scripts: `npm run build` · `npm run lint` · `npm run test:e2e` ·
`npm run deploy:rules` (Firestore rules).

## 🛠 Stack

| Concern        | Tech |
|----------------|------|
| Framework      | Next.js 16 (App Router), React 19 |
| DB / Auth      | Firebase Firestore + Firebase Auth (dual app: customer + staff) |
| Hosting        | Vercel (auto-deploy from GitHub `main`) |
| Email / SMS    | Resend / Twilio |
| Search         | Algolia (optional, local fallback) |
| Payments       | Cash on delivery + PayPal; card layer provider-agnostic & off by default |

## 📦 Deployment & handoff

**See [`DEPLOYMENT.md`](DEPLOYMENT.md)** for the full deploy guide and project-state
handoff — GitHub→Vercel flow, environment variables, secrets handling, cron/plan
gotchas, Firestore rules, and the list of what's done vs. pending.

> ⚠️ This repo is **public**. Never commit secrets — the Firebase service-account
> key, `.env*`, and recovery codes are git-ignored. See `DEPLOYMENT.md` §4.
