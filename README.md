# RankIQ

> The SEO co-pilot for business owners who want more sales, not more data.

RankIQ audits your website across technical and on-page SEO, ranks every issue by revenue impact, and gives you an AI-generated plain-English action plan — so you know exactly what to fix this week.

## Quick Start

```bash
cp .env.example .env        # fill in your keys
npm install
npm run db:migrate
npm run dev                  # Terminal 1 — Next.js app
npm run worker               # Terminal 2 — BullMQ worker (required for audits)
```

Open [http://localhost:3000](http://localhost:3000).

> **Important:** Audits require **two processes** running simultaneously — the Next.js app and the worker. Without `npm run worker`, audits will queue up but never process.

## Production Deployment (Railway)

RankIQ uses **two Railway services** that share a Redis instance:

| Service | Start command | Notes |
|---------|--------------|-------|
| **Web** | `npm run start` | Next.js app |
| **Worker** | `npm run worker` | BullMQ job processor |

**Required environment variables:**

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Redis (shared between web + worker)
REDIS_URL=redis://...

# Google OAuth (for GSC integration)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Anthropic AI
ANTHROPIC_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_GROWTH=...
STRIPE_PRICE_ID_AGENCY=...

# Email
RESEND_API_KEY=...
EMAIL_FROM=hello@your-domain.com

# Optional: PageSpeed Insights API key (avoids 429 rate limits)
PAGESPEED_API_KEY=...
```

**Deployment steps:**
1. Push to GitHub
2. Connect Railway to your repo → create **Web** service (`npm start`)
3. Add a **Redis** plugin to Railway
4. Add a second **Worker** service (same repo, start command: `npm run worker`)
5. Set all env vars in both services (share Redis URL)
6. Run migrations: `npm run db:migrate` in the Web service shell
7. Configure Stripe webhooks pointing to `https://your-domain.com/api/webhooks/stripe`

## Development

```bash
make dev        # start Next.js dev server
make worker     # start BullMQ crawl worker (separate terminal)
make test       # run all tests
make lint       # ESLint + TypeScript check
make check      # lint + test
make db:migrate # run pending migrations
make db:seed    # seed dev data
```

## Stack

- **Frontend/API:** Next.js 15 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL + Drizzle ORM
- **Jobs:** BullMQ + Redis
- **AI:** Anthropic Claude API
- **Crawler:** Crawlee
- **Auth:** Auth.js v5
- **Payments:** Stripe
- **Email:** Resend

## Docs

- [PRODUCT.md](docs/PRODUCT.md) — product vision, scope, plan
- [STRUCTURE.md](docs/STRUCTURE.md) — folder map and purpose of each directory
- [docs/features/](docs/features/) — per-feature documentation
