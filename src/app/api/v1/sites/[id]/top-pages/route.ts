import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(site.id)
  if (!audit || !audit.pageAnalyses) {
    return NextResponse.json({ data: { pages: [], message: "No audit data yet" } })
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 100)
  const sortBy = req.nextUrl.searchParams.get("sort") ?? "links"

  const analyses = audit.pageAnalyses as PageAnalysis[]

  const sorted = [...analyses].sort((a, b) => {
    if (sortBy === "score") return b.onPageScore - a.onPageScore
    if (sortBy === "words") return (b.wordCount ?? 0) - (a.wordCount ?? 0)
    // default: incoming links
    const linkDiff = (b.incomingInternalLinks ?? 0) - (a.incomingInternalLinks ?? 0)
    return linkDiff !== 0 ? linkDiff : b.onPageScore - a.onPageScore
  }).slice(0, limit)

  return NextResponse.json({ data: { pages: sorted, total: analyses.length, auditId: audit.id } })
}
