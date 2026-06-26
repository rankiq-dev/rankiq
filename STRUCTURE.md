# STRUCTURE.md — RankIQ

Folder map for the RankIQ codebase. One folder = one concern. Dependencies point inward:
`app routes → domain → db/providers`. No god-files.

## Root

```
rankiq/
├── src/                    # all application source code
├── public/                 # static assets served directly by Next.js
├── evals/                  # AI eval datasets (golden input→expected output pairs)
├── tests/                  # test suites (unit, integration, AI evals)
├── docs/                   # project documentation
├── scripts/                # one-off dev/ops scripts (not business logic)
├── .github/                # CI workflows + Dependabot config
├── .env.example            # secret NAMES only — never real values
├── .gitignore              # ignores .env and all variants
├── .gitleaks.toml          # secret scanning config (runs in pre-commit + CI)
├── .pre-commit-config.yaml # git hooks: lint, format, secret-scan
├── CHANGELOG.md            # release history (Keep a Changelog format)
├── SECURITY.md             # how to report a vulnerability
├── README.md               # quick-start and stack overview
├── Makefile                # dev commands: make dev, make test, make check
├── package.json            # Node.js dependencies (dev/prod split)
└── PRODUCT.md              # living product spine (vision, scope, plan, build log)
```

## src/ — Application Source

```
src/
├── app/                    # Next.js App Router — routes, layouts, pages, API handlers
│   ├── (auth)/             # auth route group (login, register) — no dashboard shell
│   │   ├── login/          # /login page
│   │   └── register/       # /register page
│   ├── (dashboard)/        # dashboard route group — wraps all authenticated pages
│   │   ├── dashboard/      # /dashboard — overview, site health scores
│   │   ├── sites/          # /sites — site management
│   │   │   └── [siteId]/   # per-site pages
│   │   │       ├── audit/       # full audit results view
│   │   │       └── action-plan/ # AI-ranked action plan
│   │   └── account/        # /account — billing, subscription, profile
│   ├── api/                # Next.js Route Handlers (thin — no business logic here)
│   │   ├── auth/           # Auth.js API routes (signin, signout, callback)
│   │   ├── sites/          # CRUD for user sites
│   │   ├── audits/         # trigger audit, fetch results
│   │   └── webhooks/       # Stripe webhooks (billing events)
│   ├── layout.tsx          # root layout (fonts, providers, metadata)
│   ├── page.tsx            # landing/marketing page
│   └── globals.css         # global styles + CSS variable tokens
│
├── components/             # reusable React components
│   ├── ui/                 # shadcn/ui primitives (Button, Card, Badge, etc.)
│   ├── features/           # feature-specific compound components
│   │   ├── audit/          # AuditResults, IssueCard, SeverityBadge
│   │   ├── action-plan/    # ActionPlanList, ActionItem, ImpactChip
│   │   └── sites/          # SiteCard, AddSiteForm, CrawlStatus
│   ├── layout/             # Sidebar, Header, PageShell, Nav
│   └── auth/               # LoginForm, RegisterForm, OAuthButton
│
├── lib/                    # client-side utilities (no server secrets here)
│   ├── api/                # typed fetch wrappers for calling our own API routes
│   ├── hooks/              # React hooks (useAudit, useSites, useSubscription)
│   ├── utils/              # pure helpers (formatDate, truncate, cn)
│   ├── types/              # shared TypeScript types and interfaces
│   └── constants/          # app-wide constants (plan limits, severity levels)
│
├── domain/                 # business logic — the "what RankIQ does"
│   ├── audit/              # audit orchestration: run crawl → analyse → score
│   ├── action-plan/        # rank issues by impact, call LLM, return action plan
│   ├── sites/              # site management, crawl scheduling
│   └── subscriptions/      # plan limits, feature gates, subscription state
│
├── db/                     # data access layer — all DB reads/writes live here
│   ├── schema/             # Drizzle schema definitions (the source of truth)
│   ├── migrations/         # generated migration files (never hand-edited)
│   └── repositories/       # typed query functions (getSiteById, getAuditResults…)
│
├── providers/              # adapter interfaces for every external service
│   ├── llm/                # LLMProvider interface + AnthropicAdapter
│   ├── crawler/            # CrawlerService interface + CrawleeAdapter
│   ├── search-console/     # SearchConsoleProvider + GoogleAdapter
│   ├── billing/            # BillingProvider interface + StripeAdapter
│   └── email/              # EmailProvider interface + ResendAdapter
│
├── infra/                  # cross-cutting technical concerns
│   ├── logger/             # structured logger (pino) — no console.log in app code
│   ├── queue/              # BullMQ queue setup and job types
│   ├── cache/              # Redis cache helpers
│   └── circuit-breaker/    # circuit-breaker wrapper for external calls
│
├── auth/                   # Auth.js config, session helpers, middleware guards
│
├── config/                 # typed config loader — reads .env at startup, fails loud
│   └── index.ts            # validates all required env vars via Zod; throws on missing
│
├── jobs/                   # BullMQ job processors (run in Railway worker process)
│   # crawl.job.ts          # processes queued crawl jobs
│   # audit.job.ts          # post-crawl analysis pipeline
│   # email.job.ts          # weekly report email sender
│
├── prompts/                # versioned AI prompts as YAML — NEVER inline in code
│   # action-plan-v1.yaml   # prompt for AI Action Plan generation
│
├── validators/             # Zod schemas for validating user input at API boundaries
│
└── middleware.ts           # Next.js edge middleware: auth guards, redirect logic
```

## tests/

```
tests/
├── unit/          # unit tests for domain logic (pure functions, no DB/network)
├── integration/   # integration tests hitting real DB and queue (test containers)
└── evals/         # AI output quality tests against golden datasets
```

## evals/

```
evals/
└── action-plan/   # golden input→expected output pairs for the AI Action Plan
```

## Key rules

1. **No secrets in code** — all values via `src/config/index.ts` which reads `.env`
2. **No vendor SDK in domain/ or app/** — always go through `src/providers/*`
3. **No business logic in `app/api/`** — route handlers call domain functions only
4. **Prompts in `src/prompts/*.yaml`** — never a prompt string in a `.ts` file
5. **Schema changes via migrations only** — `drizzle-kit generate` then `drizzle-kit migrate`
