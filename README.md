# RankIQ

> The SEO co-pilot for business owners who want more sales, not more data.

RankIQ audits your website across technical and on-page SEO, ranks every issue by revenue impact, and gives you an AI-generated plain-English action plan — so you know exactly what to fix this week.

## Quick Start

```bash
cp .env.example .env        # fill in your keys
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
