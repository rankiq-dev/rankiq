# M1 — Auth + Billing

## What
Walking skeleton: a user can sign up via Google OAuth, land on a protected dashboard, view their plan, and upgrade to a paid plan via Stripe Checkout. Subscription state is kept current via Stripe webhooks.

## Definition of Done (incl. security)

| Criterion | Status |
|---|---|
| Google OAuth sign-in → session → protected dashboard | ✅ |
| Dashboard shows "No sites added yet" empty state | ✅ |
| Pricing page shows Starter / Growth / Agency plans | ✅ |
| `POST /api/v1/billing/checkout` creates Stripe Checkout Session | ✅ |
| `POST /api/webhooks/stripe` validates signature + updates subscription state | ✅ |
| `GET /api/v1/account` returns plan + subscription status | ✅ |
| **Security: stripe-signature verified before any processing** | ✅ |
| **Security: userId always from session, never from request body** | ✅ |
| **Security: Zod validation on all POST bodies** | ✅ |
| **Security: no secrets in code (all from config/env)** | ✅ |
| **Security: PII (email) never in logs** | ✅ |
| **Tenant isolation: all DB queries scoped to authenticated userId** | ✅ |
| `tsc --noEmit` clean | ✅ |
| 10/10 existing tests still pass | ✅ |

## API Contract

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Public | Auth.js v5 OAuth handler |
| `/api/v1/account` | GET | Required | Current user + plan |
| `/api/v1/billing/checkout` | POST | Required | Create Stripe Checkout Session → returns `{ data: { url } }` |
| `/api/webhooks/stripe` | POST | Public (signature-gated) | Stripe event handler |

### Checkout request
```json
{ "plan": "growth" | "agency" }
```

### Checkout response
```json
{ "data": { "url": "https://checkout.stripe.com/..." } }
```

### Webhook events handled
- `customer.subscription.created` — sets plan + status on user
- `customer.subscription.updated` — updates plan + status  
- `customer.subscription.deleted` — downgrades to starter + sets canceled
- `checkout.session.completed` — logged for audit trail only

## Idempotency
- Stripe webhook events: Stripe deduplicates via `event.id`; we log + process; `stripeSubscriptionId` UNIQUE constraint on users table prevents double-writes
- Checkout sessions: `customer_email` passed; Stripe prevents duplicate active subscriptions per customer

## Pages / Routes

| Path | Component | Guard |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Public; redirects to `/dashboard` if session exists |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Auth middleware → redirect `/login` |
| `/pricing` | `pricing/page.tsx` | Public |

## Code locations

| File | Purpose |
|---|---|
| [`src/app/(auth)/login/page.tsx`](../../src/app/(auth)/login/page.tsx) | Google sign-in page (Cinematic Dark Pro design) |
| [`src/app/(dashboard)/layout.tsx`](../../src/app/(dashboard)/layout.tsx) | Protected layout: sidebar + user info |
| [`src/app/(dashboard)/dashboard/page.tsx`](../../src/app/(dashboard)/dashboard/page.tsx) | Dashboard with empty state + site list |
| [`src/app/pricing/page.tsx`](../../src/app/pricing/page.tsx) | Plan comparison + checkout CTA |
| [`src/app/api/auth/[...nextauth]/route.ts`](../../src/app/api/auth/[...nextauth]/route.ts) | Auth.js handler |
| [`src/app/api/v1/account/route.ts`](../../src/app/api/v1/account/route.ts) | Account API |
| [`src/app/api/v1/billing/checkout/route.ts`](../../src/app/api/v1/billing/checkout/route.ts) | Stripe Checkout Session creator |
| [`src/app/api/webhooks/stripe/route.ts`](../../src/app/api/webhooks/stripe/route.ts) | Stripe webhook handler |
| [`src/providers/billing/index.ts`](../../src/providers/billing/index.ts) | Stripe adapter (singleton, circuit-breakable) |

## How verified
- `npx tsc --noEmit` — 0 errors
- `npm test` — 10/10 pass
- Stripe webhook: signature check is the FIRST operation; request body read raw before any parsing
- `userId` sourced: `session.user.id` from `auth()` call in every route handler — never from request body
- Secrets: `stripeSecretKey` and `stripeWebhookSecret` from `config` (Zod-validated env at boot); no literal secrets in any file

## To fully exercise M1 (needs live env)
1. Set real `.env.local` values: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `NEXTAUTH_SECRET` ≥32 chars
2. Set Stripe test keys: `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`
3. Create products in Stripe dashboard → set `STRIPE_GROWTH_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`
4. Run migrations: `npm run db:migrate`
5. `npm run dev` → visit `/login` → sign in with Google → dashboard shows empty state
6. Visit `/pricing` → click "Upgrade to Growth" → Stripe test checkout → card `4242 4242 4242 4242`
7. Stripe webhook (via `stripe listen --forward-to localhost:3000/api/webhooks/stripe`) → plan updates on user
