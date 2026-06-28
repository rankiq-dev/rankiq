import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/audits/:id/jira-export — Export issues as Jira-compatible JSON tickets */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const issues = await getIssuesByAudit(id, { limit: 500 })
  const open = issues.filter(i => !i.isFixed)

  const PRIORITY: Record<string, string> = {
    critical: "High", warning: "Medium", info: "Low",
  }

  const tickets = open.map((issue, idx) => ({
    summary: `[SEO] ${issue.title} — ${site.domain}`,
    description: [
      `*Audit:* ${site.domain} (${new Date(audit.completedAt ?? Date.now()).toLocaleDateString()})`,
      `*Severity:* ${issue.severity}`,
      `*Category:* ${issue.category}`,
      "",
      issue.description,
      "",
      issue.fixInstructions ? `*How to fix:*\n${issue.fixInstructions}` : "",
      "",
      issue.affectedUrls?.length ? `*Affected pages (${issue.affectedCount}):*\n${issue.affectedUrls.slice(0, 5).join("\n")}` : "",
    ].filter(Boolean).join("\n"),
    issuetype: { name: "Task" },
    priority: { name: PRIORITY[issue.severity] ?? "Medium" },
    labels: ["seo", "rankiq", issue.category ?? "technical"],
    customFields: {
      affectedCount: issue.affectedCount,
      issueType: issue.type,
      auditId: id,
    },
    _index: idx + 1,
  }))

  return NextResponse.json(
    { tickets, exportedAt: new Date().toISOString(), siteId: audit.siteId, domain: site.domain },
    { headers: { "Content-Disposition": `attachment; filename="rankiq-jira-${site.domain}-${new Date().toISOString().slice(0, 10)}.json"` } }
  )
}
