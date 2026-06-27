import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { audits, sites } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

/** GET /api/v1/sites/:id/badge — public SVG health score badge (no auth required) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  /* Only show badge if the site has a completed public audit (shareToken set) */
  const site = await db.query.sites.findFirst({ where: eq(sites.id, id) })
  if (!site) {
    return new NextResponse("Not found", { status: 404 })
  }

  const latestAudit = await db.query.audits.findFirst({
    where: eq(audits.siteId, id),
    orderBy: [desc(audits.completedAt)],
    columns: { healthScore: true, status: true },
  })

  const score = latestAudit?.status === "complete" ? (latestAudit.healthScore ?? null) : null
  const label = req.nextUrl.searchParams.get("label") ?? "SEO Score"

  const color = score == null ? "#6b7280"
    : score >= 90 ? "#22c55e"
    : score >= 70 ? "#3b82f6"
    : score >= 50 ? "#f59e0b"
    : "#ef4444"

  const scoreText = score != null ? `${score}` : "N/A"
  const labelWidth = Math.max(label.length * 7 + 16, 60)
  const valueWidth = 44
  const totalWidth = labelWidth + valueWidth

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${scoreText}">
  <title>${label}: ${scoreText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text aria-hidden="true" x="${(labelWidth / 2 + 1) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2 + 1) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 10) * 10}" lengthAdjust="spacing">${scoreText}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" textLength="${(valueWidth - 10) * 10}" lengthAdjust="spacing">${scoreText}</text>
  </g>
</svg>`

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
