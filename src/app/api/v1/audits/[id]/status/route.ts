import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/audits/:id/status — lightweight status check for polling */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    data: {
      status: audit.status,
      healthScore: audit.healthScore,
      pagesCount: audit.pagesCount ?? null,
      maxPages: (site as { maxPages?: number }).maxPages ?? null,
      stage: audit.status,
    }
  })
}
