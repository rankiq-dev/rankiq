import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"

/** GET /api/v1/sites/:id/keywords-export — CSV download of all keyword data */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const keywords = await getKeywordPositionChanges(id, 1000)

  const header = ["Keyword", "Position", "Position Change", "Clicks", "Impressions", "CTR"]
  const rows = keywords.map(k => [
    `"${k.query.replace(/"/g, '""')}"`,
    k.position,
    k.positionChange ?? "",
    k.clicks,
    k.impressions,
    (parseFloat(k.ctr) * 100).toFixed(2) + "%",
  ])

  const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\r\n")
  const filename = `rankiq-keywords-${site.domain}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
