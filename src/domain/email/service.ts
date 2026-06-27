import { sendEmail } from "@/providers/email"
import { auditReportEmail, welcomeEmail } from "@/domain/email/templates"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSitesByUser } from "@/db/repositories/sites"
import { getUserById } from "@/db/repositories/users"
import { logger } from "@/infra/logger"
import { config } from "@/config"

export type EmailJobPayload =
  | { type: "audit_report"; auditId: string; userId: string }
  | { type: "welcome"; userId: string }

export async function processEmailJob(payload: EmailJobPayload): Promise<void> {
  if (payload.type === "welcome") {
    await sendWelcomeEmail(payload.userId)
  } else if (payload.type === "audit_report") {
    await sendAuditReportEmail(payload.auditId, payload.userId)
  }
}

export async function sendWelcomeEmail(userId: string): Promise<void> {
  const user = await getUserById(userId)
  if (!user?.email) {
    logger.warn({ userId }, "sendWelcomeEmail: user not found or no email")
    return
  }
  const { subject, html } = welcomeEmail({ recipientName: user.name, appUrl: config.appUrl })
  const { id } = await sendEmail({ to: user.email, subject, html })
  logger.info({ emailId: id, userId }, "Welcome email sent")
}

export async function sendAuditReportEmail(auditId: string, userId: string): Promise<void> {
  const audit = await getAuditById(auditId)
  if (!audit || audit.status !== "complete" || audit.healthScore == null) {
    logger.warn({ auditId }, "sendAuditReportEmail: audit not found or not complete")
    return
  }

  /* Resolve site for domain, user for email + name */
  const [user, sites] = await Promise.all([
    getUserById(userId),
    getSitesByUser(userId),
  ])

  if (!user?.email) {
    logger.warn({ userId }, "sendAuditReportEmail: user not found or no email")
    return
  }

  const site = sites.find((s) => s.id === audit.siteId)
  if (!site) {
    logger.warn({ auditId, userId }, "sendAuditReportEmail: site not found for user")
    return
  }

  /* Get previous audit health score for trend */
  const allAudits = await import("@/db/repositories/audits").then((m) => m.getAuditsForSite(site.id))
  const completedAudits = allAudits
    .filter((a) => a.status === "complete" && a.healthScore != null && a.id !== auditId)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
  const prevHealthScore = completedAudits[0]?.healthScore ?? null

  const issues = await getIssuesByAudit(auditId, { limit: 50 })
  const criticalCount = issues.filter((i) => i.severity === "critical").length
  const warningCount  = issues.filter((i) => i.severity === "warning").length
  const topIssues     = issues.slice(0, 5).map((i) => ({
    title: i.title,
    severity: i.severity,
    affectedCount: i.affectedCount,
  }))

  const { subject, html } = auditReportEmail({
    recipientName:  user.name,
    domain:         site.domain,
    auditId,
    healthScore:    audit.healthScore,
    prevHealthScore,
    pagesCount:     audit.pagesCount ?? 0,
    criticalCount,
    warningCount,
    topIssues,
    appUrl: config.appUrl,
  })

  const { id } = await sendEmail({ to: user.email, subject, html })
  logger.info({ emailId: id, auditId, userId }, "Audit report email sent")
}
