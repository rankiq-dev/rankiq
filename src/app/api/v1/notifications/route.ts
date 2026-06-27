import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getRecentCompletedAudits } from "@/db/repositories/audits"

/** GET /api/v1/notifications — recent completed audits as notification items */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await getSitesByUser(session.user.id)
  if (sites.length === 0) return NextResponse.json({ data: { notifications: [] } })

  const recentAudits = await getRecentCompletedAudits(sites.map(s => s.id), 48)

  const notifications = recentAudits.map(audit => {
    const site = sites.find(s => s.id === audit.siteId)
    const score = audit.healthScore
    const scoreLabel = score == null ? "" : score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "needs work" : "critical issues"
    return {
      id: audit.id,
      type: "audit_complete",
      title: `${site?.displayName ?? site?.domain ?? "Site"} audit complete`,
      body: score != null ? `Health score: ${score}/100 (${scoreLabel})` : "Audit finished",
      href: `/audits/${audit.id}`,
      createdAt: audit.completedAt,
    }
  })

  return NextResponse.json({ data: { notifications } })
}
