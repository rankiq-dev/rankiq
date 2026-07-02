import { and, eq, desc, inArray, gte } from "drizzle-orm"
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

export async function markIssueFixed(
  id: string,
  fixed = true,
  opts?: { assignedTo?: string; fixNote?: string }
): Promise<AuditIssue> {
  const [row] = await db
    .update(auditIssues)
    .set({
      isFixed: fixed,
      fixedAt: fixed ? new Date() : null,
      ...(fixed && opts?.assignedTo !== undefined ? { assignedTo: opts.assignedTo || null } : {}),
      ...(fixed && opts?.fixNote !== undefined ? { fixNote: opts.fixNote || null } : {}),
      /* Clear verifiedFixed when reopening so next audit re-confirms */
      ...(fixed ? {} : { verifiedFixed: false }),
    })
    .where(eq(auditIssues.id, id))
    .returning()
  if (!row) throw new Error(`markIssueFixed: no issue found with id ${id}`)
  return row
}

/** After a new audit completes, mark previously-fixed issues as verifiedFixed=true
 *  if the same issue TYPE is not detected in the new audit for the same site. */
export async function verifyFixedIssues(siteId: string, newAuditId: string): Promise<void> {
  /* Get issue types found in the new (just-completed) audit */
  const newIssues = await db
    .select({ type: auditIssues.type })
    .from(auditIssues)
    .innerJoin(audits, eq(auditIssues.auditId, audits.id))
    .where(eq(audits.id, newAuditId))
  const newIssueTypes = new Set(newIssues.map(i => i.type))

  /* Find all fixed-but-not-yet-verified issues from prior audits for this site */
  const priorFixed = await db
    .select({ id: auditIssues.id, type: auditIssues.type })
    .from(auditIssues)
    .innerJoin(audits, eq(auditIssues.auditId, audits.id))
    .where(
      and(
        eq(audits.siteId, siteId),
        eq(auditIssues.isFixed, true),
        eq(auditIssues.verifiedFixed, false)
      )
    )

  /* Set verifiedFixed=true for any issue type NOT detected in new audit */
  const toVerify = priorFixed.filter(i => !newIssueTypes.has(i.type)).map(i => i.id)
  if (toVerify.length === 0) return

  for (let i = 0; i < toVerify.length; i += 100) {
    await db
      .update(auditIssues)
      .set({ verifiedFixed: true })
      .where(inArray(auditIssues.id, toVerify.slice(i, i + 100)))
  }
}

export async function bulkMarkIssuesFixed(auditId: string, ids: string[], fixed: boolean): Promise<number> {
  const result = await db
    .update(auditIssues)
    .set({ isFixed: fixed, fixedAt: fixed ? new Date() : null })
    .where(and(eq(auditIssues.auditId, auditId), inArray(auditIssues.id, ids)))
  return (result as { rowCount?: number }).rowCount ?? ids.length
}

export async function updateIssueAiFields(
  id: string,
  data: { fixInstructions: string; revenueImpactRank: number }
): Promise<void> {
  await db.update(auditIssues).set(data).where(eq(auditIssues.id, id))
}

/** Get audits completed in the last N hours for a set of site IDs */
export async function getRecentCompletedAudits(siteIds: string[], hoursBack = 24): Promise<Audit[]> {
  if (siteIds.length === 0) return []
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  return db.query.audits.findMany({
    where: and(
      inArray(audits.siteId, siteIds),
      eq(audits.status, "complete"),
      gte(audits.completedAt, since)
    ),
    orderBy: [desc(audits.completedAt)],
    limit: 20,
  })
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
