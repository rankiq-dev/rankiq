import { NextResponse } from "next/server"
import { db } from "@/db"
import { audits, sites } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

/** GET /api/v1/sites/:id/badge/json — public JSON health summary (no auth required) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const site = await db.query.sites.findFirst({ where: eq(sites.id, id), columns: { id: true, domain: true, displayName: true } })
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const latestAudit = await db.query.audits.findFirst({
    where: eq(audits.siteId, id),
    orderBy: [desc(audits.completedAt)],
    columns: { healthScore: true, status: true, completedAt: true, pagesCount: true },
  })

  return NextResponse.json({
    siteId: id,
    domain: site.domain,
    displayName: site.displayName,
    healthScore: latestAudit?.status === "complete" ? latestAudit.healthScore : null,
    pagesCount: latestAudit?.pagesCount ?? null,
    lastAudit: latestAudit?.completedAt ?? null,
    status: latestAudit?.status ?? "no_audit",
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
