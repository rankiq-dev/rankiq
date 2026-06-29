import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/audit-history?limit=20 — full audit history with scores */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "20"))
  const audits = await getAuditsForSite(id, limit)

  return NextResponse.json({
    data: {
      siteId: id,
      domain: site.domain,
      audits: audits.map(a => ({
        id: a.id,
        status: a.status,
        healthScore: a.healthScore,
        pagesCount: a.pagesCount,
        createdAt: a.createdAt?.toISOString(),
        startedAt: a.startedAt?.toISOString() ?? null,
        completedAt: a.completedAt?.toISOString() ?? null,
        errorMessage: a.errorMessage ?? null,
      })),
    },
  })
}
