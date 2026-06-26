import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"
import { disconnectGsc, getGscAuthUrl, refreshGscData } from "@/domain/sites/gsc"

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/v1/sites/:id/gsc — Returns GSC connection status + top keywords */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }
  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Site not found" } }, { status: 404 })
  }

  const keywords = site.gscConnected ? await getKeywordMetricsBySite(id) : []

  return NextResponse.json({
    data: {
      connected: site.gscConnected,
      authUrl: site.gscConnected ? null : getGscAuthUrl(id, session.user.id),
      keywords: keywords.map((k) => ({
        keyword:    k.keyword,
        clicks:     k.clicks,
        impressions: k.impressions,
        positionAvg: Number(k.positionAvg),
        ctrPct:     Number(k.ctrPct),
        dateRangeStart: k.dateRangeStart,
        dateRangeEnd:   k.dateRangeEnd,
      })),
    },
  })
}

/** POST /api/v1/sites/:id/gsc — Refresh GSC data for connected site */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }
  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Site not found" } }, { status: 404 })
  }
  if (!site.gscConnected) {
    return NextResponse.json({ error: { code: "GSC_NOT_CONNECTED", message: "GSC not connected" } }, { status: 409 })
  }

  try {
    await refreshGscData(id, session.user.id)
    return NextResponse.json({ data: { refreshed: true } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: { code: "GSC_REFRESH_FAILED", message: msg } }, { status: 502 })
  }
}

/** DELETE /api/v1/sites/:id/gsc — Disconnect GSC */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }
  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Site not found" } }, { status: 404 })
  }

  await disconnectGsc(id, session.user.id)
  return NextResponse.json({ data: { disconnected: true } })
}
