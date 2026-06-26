import { llm } from "@/providers/llm"
import { logger } from "@/infra/logger"
import { getIssuesByAudit, updateIssueAiFields } from "@/db/repositories/audits"
import { getAuditById } from "@/db/repositories/audits"
import { loadPrompt, fillTemplate } from "./prompt-loader"
import { MAX_ACTION_PLAN_ISSUES } from "@/lib/constants"
import type { AuditIssue } from "@/db/schema"

/* ── Prompt injection defence ────────────────────────────────────────
   All user-supplied or crawled-content fields are sanitized before
   being sent to the LLM. Domain is a validated hostname (no special
   chars). Issue titles/descriptions are server-generated strings (no
   user input). AffectedUrls come from crawled pages — sanitize to
   path-only, strip query strings, cap length. */

const MAX_URL_PATH_LEN = 80
const MAX_FIX_INSTRUCTIONS_LEN = 400

/** Strip to path only, remove query string and fragment, cap length */
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    const path = u.pathname.slice(0, MAX_URL_PATH_LEN)
    return path || "/"
  } catch {
    return "/"
  }
}

/** Build the structured issue payload sent to the LLM — only safe fields */
function buildIssuePayload(issues: AuditIssue[]) {
  return issues.map((issue) => ({
    type: issue.type,                    /* server-generated slug */
    severity: issue.severity,            /* enum value */
    title: issue.title,                  /* server-generated */
    affectedCount: issue.affectedCount,
    /* samplePaths: path-only, no query strings, capped length */
    samplePaths: ((issue.affectedUrls as string[]) ?? [])
      .slice(0, 3)
      .map(sanitizeUrl),
  }))
}

interface ActionPlanOutput {
  issues: {
    type: string
    revenueImpactRank: number
    fixInstructions: string
  }[]
}

function parseActionPlanResponse(raw: string): ActionPlanOutput {
  /* Strip markdown code fences if model wraps JSON despite instructions */
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  const parsed = JSON.parse(cleaned) as ActionPlanOutput
  if (!Array.isArray(parsed.issues)) throw new Error("LLM response missing issues array")
  return parsed
}

export async function generateActionPlan(auditId: string): Promise<void> {
  const audit = await getAuditById(auditId)
  if (!audit) throw new Error(`Audit ${auditId} not found`)
  if (audit.status !== "complete") {
    throw new Error(`Audit ${auditId} is ${audit.status} — action plan requires a completed audit`)
  }

  const issues = await getIssuesByAudit(auditId, { limit: MAX_ACTION_PLAN_ISSUES })
  if (issues.length === 0) {
    logger.info({ auditId }, "No issues to rank — skipping action plan")
    return
  }

  const prompt = loadPrompt("action-plan-v1.yaml")
  const issuePayload = buildIssuePayload(issues)

  const userMessage = fillTemplate(prompt.userTemplate, {
    DOMAIN:      audit.siteId, /* siteId used as a safe identifier — domain resolved separately if needed */
    PAGES_COUNT: String(audit.pagesCount ?? 0),
    ISSUES_JSON: JSON.stringify(issuePayload, null, 2),
  })

  logger.info({ auditId, issueCount: issues.length, model: prompt.model }, "Generating action plan")

  const result = await llm.generate({
    model:     prompt.model,
    maxTokens: prompt.maxTokens,
    system:    prompt.system,
    messages:  [{ role: "user", content: userMessage }],
  })

  let output: ActionPlanOutput
  try {
    output = parseActionPlanResponse(result.content)
  } catch (err) {
    logger.error({ auditId, rawResponse: result.content.slice(0, 200), err }, "Failed to parse action plan response")
    throw new Error("Action plan LLM response was not valid JSON")
  }

  /* Build lookup: issue type → LLM output */
  const byType = new Map(output.issues.map((o) => [o.type, o]))

  /* Validate ranks are unique and positive integers */
  const ranks = output.issues.map((o) => o.revenueImpactRank)
  const uniqueRanks = new Set(ranks)
  if (uniqueRanks.size !== ranks.length) {
    logger.warn({ auditId, ranks }, "LLM returned duplicate revenue impact ranks — reassigning sequentially")
    output.issues.forEach((o, i) => { o.revenueImpactRank = i + 1 })
  }

  /* Persist to DB */
  await Promise.all(
    issues.map((issue) => {
      const plan = byType.get(issue.type)
      if (!plan) {
        logger.warn({ auditId, issueType: issue.type }, "LLM did not return action plan for issue")
        return Promise.resolve()
      }
      const fixInstructions = plan.fixInstructions.slice(0, MAX_FIX_INSTRUCTIONS_LEN)
      const revenueImpactRank = Math.max(1, Math.round(plan.revenueImpactRank))
      return updateIssueAiFields(issue.id, { fixInstructions, revenueImpactRank })
    })
  )

  logger.info(
    { auditId, issueCount: issues.length, inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    "Action plan complete"
  )
}
