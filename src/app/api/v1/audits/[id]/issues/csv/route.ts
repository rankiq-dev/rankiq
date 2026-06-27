import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/audits/:id/issues/csv — Download issues as CSV */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return new Response("Not found", { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return new Response("Not found", { status: 404 })

  if (audit.status !== "complete") return new Response("Audit not complete", { status: 409 })

  const issues = await getIssuesByAudit(id, { limit: 200 })

  const rows: string[] = [
    "Severity,Category,Type,Title,Affected Pages,Fixed,Revenue Impact Rank"
  ]

  for (const issue of issues) {
    const urls = (issue.affectedUrls as string[] | null)?.join("; ") ?? ""
    rows.push([
      issue.severity,
      issue.category,
      issue.type,
      `"${(issue.title ?? "").replace(/"/g, '""')}"`,
      issue.affectedCount ?? 0,
      issue.isFixed ? "Yes" : "No",
      issue.revenueImpactRank ?? "",
    ].join(","))
  }

  const csv = rows.join("\n")
  const filename = `rankiq-issues-${site.domain.replace(/[^a-z0-9]/gi, "-")}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
