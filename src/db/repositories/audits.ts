import { and, eq, desc } from "drizzle-orm"
import { db } from "@/db"
import { audits, auditIssues, type Audit, type NewAudit, type AuditIssue, type NewAuditIssue } from "@/db/schema"

/* ── Audits ──────────────────────────────────────────── */

export async function getAuditById(id: string): Promise<Audit | undefined> {
  return db.query.audits.findFirst({ where: eq(audits.id, id) })
}

export async function getLatestAuditForSite(siteId: string): Promise<Audit | undefined> {
  return db.query.audits.findFirst({
    where: eq(audits.siteId, siteId),
    orderBy: [desc(audits.createdAt)],
  })
}

export async function getAuditsForSite(siteId: string, limit = 10): Promise<Audit[]> {
  return db.query.audits.findMany({
    where: eq(audits.siteId, siteId),
    orderBy: [desc(audits.createdAt)],
    limit,
  })
}

export async function createAudit(data: NewAudit): Promise<Audit> {
  const [row] = await db.insert(audits).values(data).returning()
  if (!row) throw new Error("createAudit: insert returned no row")
  return row
}

export async function updateAuditStatus(
  id: string,
  data: Pick<Partial<Audit>, "status" | "pagesCount" | "healthScore" | "errorMessage" | "pageAnalyses" | "startedAt" | "completedAt">
): Promise<Audit> {
  const [row] = await db
    .update(audits)
    .set(data)
    .where(eq(audits.id, id))
    .returning()
  if (!row) throw new Error(`updateAuditStatus: no audit found with id ${id}`)
  return row
}

/* ── Audit Issues ────────────────────────────────────── */

export async function getIssuesByAudit(
  auditId: string,
  opts: { severity?: AuditIssue["severity"]; limit?: number } = {}
): Promise<AuditIssue[]> {
  return db.query.auditIssues.findMany({
    where: opts.severity
      ? and(eq(auditIssues.auditId, auditId), eq(auditIssues.severity, opts.severity))
      : eq(auditIssues.auditId, auditId),
    orderBy: [auditIssues.revenueImpactRank],
    limit: opts.limit,
  })
}

export async function bulkInsertIssues(rows: NewAuditIssue[]): Promise<void> {
  if (rows.length === 0) return
  /* Insert in batches of 100 to avoid pg parameter limit */
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(auditIssues).values(rows.slice(i, i + 100))
  }
}

export async function markIssueFixed(id: string, fixed = true): Promise<AuditIssue> {
  const [row] = await db
    .update(auditIssues)
    .set({ isFixed: fixed, fixedAt: fixed ? new Date() : null })
    .where(eq(auditIssues.id, id))
    .returning()
  if (!row) throw new Error(`markIssueFixed: no issue found with id ${id}`)
  return row
}

export async function updateIssueAiFields(
  id: string,
  data: { fixInstructions: string; revenueImpactRank: number }
): Promise<void> {
  await db.update(auditIssues).set(data).where(eq(auditIssues.id, id))
}

/* ── Site health summary (derived — not stored) ──────── */
export async function getHealthSummary(auditId: string) {
  const allIssues = await db.query.auditIssues.findMany({
    where: eq(auditIssues.auditId, auditId),
    columns: { severity: true },
  })
  return {
    criticalCount: allIssues.filter((i) => i.severity === "critical").length,
    warningCount:  allIssues.filter((i) => i.severity === "warning").length,
    infoCount:     allIssues.filter((i) => i.severity === "info").length,
    totalCount:    allIssues.length,
  }
}
