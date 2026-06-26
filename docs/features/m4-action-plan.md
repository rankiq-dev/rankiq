# M4 — AI Action Plan

## What
After every audit completes, a BullMQ job automatically calls Claude (Haiku model) to rank all issues by estimated revenue impact and generate a plain-English fix instruction for each one. The result is an Action Plan tab showing issues #1–N with teal rank badges and AI-written "How to fix" cards. Non-technical business owners can understand and act on every item without SEO expertise.

## Definition of Done (incl. security)

| Criterion | Status |
|---|---|
| Prompt stored in `prompts/action-plan-v1.yaml` — not inline in code | ✅ |
| Action plan auto-triggered by BullMQ job after crawl completes | ✅ |
| `revenueImpactRank` 1=highest, unique per audit, duplicate-rank fallback | ✅ |
| `fixInstructions` capped at 400 chars before DB write | ✅ |
| `GET /api/v1/audits/:id/action-plan` returns issues sorted by rank | ✅ |
| Action Plan UI page with rank badges, severity tags, fix cards | ✅ |
| **LLM01 Prompt Injection: user-supplied URLs sent as path-only (no query string), capped at 80 chars** | ✅ |
| **LLM01: `fillTemplate` regex `\{\{(\w+)\}\}` requires word-chars only — spaces/colons in values cannot form valid tokens** | ✅ |
| **LLM06: No PII sent to LLM — only domain + server-generated issue slugs, titles, counts** | ✅ |
| **Prompt injection adversarial test suite: 14/14 tests pass** | ✅ |
| `tsc --noEmit` clean | ✅ |
| 24/24 tests pass (10 existing + 14 new security tests) | ✅ |

## Prompt Injection Defence (OWASP LLM01)

### Threat: malicious content in crawled URLs
Crawled URLs may contain query strings like `?prompt=ignore+previous+instructions`.

**Defence:** `sanitizeUrl()` strips all query strings and fragments, returns path only, caps at 80 chars. Only 3 sample paths per issue sent to LLM.

### Threat: template variable injection via issue data
If issue type slugs contained `{{SYSTEM}}` they might be substituted.

**Defence:** `fillTemplate` regex `/\{\{(\w+)\}\}/g` requires `\w+` (letters/digits/underscore only) — spaces, colons, brackets in values cannot form a valid match. Issue types are server-generated enum slugs (e.g. `missing_title_tag`) with no special chars.

### What is sent to the LLM (and what is not)
| Sent | Not sent |
|---|---|
| Domain hostname | User email, name, ID |
| Issue type slug (server enum) | Raw page HTML |
| Issue title (server string) | Meta description content from pages |
| Affected page count | Cookie / session data |
| Path-only URL samples (max 3) | Any user-authored text |

## Architecture

```
Audit complete
     ↓
BullMQ: action-plan-{auditId}
     ↓
generateActionPlan()
  ├─ loadPrompt("action-plan-v1.yaml")       ← versioned YAML, not inline
  ├─ buildIssuePayload()                      ← sanitized, PII-free
  ├─ fillTemplate(system + user)
  ├─ llm.generate() → AnthropicAdapter       ← circuit-breaker wrapped
  ├─ parseActionPlanResponse()               ← JSON validated
  ├─ validate unique ranks, dedup fallback
  └─ updateIssueAiFields() × N               ← persisted to DB
```

## Prompt versioning
`prompts/action-plan-v1.yaml` — model, maxTokens, system prompt, user template, version all in one file.  
To upgrade: create `action-plan-v2.yaml`, update the `loadPrompt()` call. Old audits retain the v1 output.

## Cost estimate (aspirational — verify at /eval)
- Model: `claude-haiku-4-5-20251001`
- ~20 issues × avg 150 tokens each = ~3,000 input tokens + ~2,000 output tokens
- Haiku pricing ≈ $0.00025/1K input + $0.00125/1K output → **~$0.003 per audit**
- Well within $0.05 target from PRODUCT.md

## Code Locations

| File | Purpose |
|---|---|
| [`prompts/action-plan-v1.yaml`](../../prompts/action-plan-v1.yaml) | Versioned prompt — system + user template |
| [`src/domain/action-plan/prompt-loader.ts`](../../src/domain/action-plan/prompt-loader.ts) | YAML loader + `fillTemplate()` |
| [`src/domain/action-plan/service.ts`](../../src/domain/action-plan/service.ts) | `generateActionPlan()` — orchestrates LLM call, persists results |
| [`src/app/api/v1/audits/[id]/action-plan/route.ts`](../../src/app/api/v1/audits/[id]/action-plan/route.ts) | GET ranked issues |
| [`src/app/(dashboard)/audits/[id]/action-plan/page.tsx`](../../src/app/(dashboard)/audits/[id]/action-plan/page.tsx) | Action Plan UI |
| [`src/jobs/worker.ts`](../../src/jobs/worker.ts) | ACTION_PLAN worker wired |
| [`src/infra/queue/index.ts`](../../src/infra/queue/index.ts) | `ACTION_PLAN` queue name added |
| [`tests/unit/action-plan-security.test.ts`](../../tests/unit/action-plan-security.test.ts) | 14 prompt injection adversarial tests |

## How Verified
- `tsc --noEmit` — 0 errors
- `npm test` — 24/24 pass (14 new security tests all green)
- Prompt injection: `sanitizeUrl("https://evil.com/page?prompt=inject")` → `"/page"` ✓
- Template safety: `{{SYSTEM: ignore}}` in values → not substituted by `fillTemplate` regex ✓
- Duplicate rank fallback: sequential reassignment when LLM returns duplicates ✓
- Rank floor: `Math.max(1, Math.round(rank))` prevents 0 or negative ranks ✓
