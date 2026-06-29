import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"

// Issues that are easy to fix (< 30 min) AND high impact
const QUICK_WIN_TYPES = new Set([
  "missing_title_tag", "title_too_long", "title_too_short",
  "missing_meta_description", "missing_h1", "no_canonical_tag",
  "multiple_h1_tags", "missing_image_alt",
])

const FIX_MINUTES: Record<string, number> = {
  missing_title_tag: 5, title_too_long: 5, title_too_short: 5,
  missing_meta_description: 10, missing_h1: 10, no_canonical_tag: 15,
  multiple_h1_tags: 10, missing_image_alt: 20,
}

/** GET /api/v1/sites/:id/quick-wins — high-impact, easy-to-fix open issues */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit) return NextResponse.json({ data: { auditId: null, wins: [] } })

  const issues = await getIssuesByAudit(audit.id, { limit: 200 })
  const open = issues.filter(i => !i.isFixed && QUICK_WIN_TYPES.has(i.type))
    .sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 }
      return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2)
    })

  const totalMinutes = open.reduce((s, i) => s + (FIX_MINUTES[i.type] ?? 15), 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const timeLabel = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim() : `${minutes}m`

  return NextResponse.json({
    data: {
      auditId: audit.id,
      totalQuickWins: open.length,
      estimatedTime: timeLabel,
      estimatedMinutes: totalMinutes,
      wins: open.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        affectedCount: i.affectedCount ?? 0,
        estimatedMinutes: FIX_MINUTES[i.type] ?? 15,
        hasAiInstructions: !!i.fixInstructions,
      })),
    },
  })
}
