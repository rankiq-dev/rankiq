import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/url-structure — URL depth distribution and structure analysis */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: null })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)

  const depthBuckets = { depth1: 0, depth2: 0, depth3: 0, depth4plus: 0 }
  const pathPrefixes = new Map<string, number>()

  for (const p of pages) {
    try {
      const url = new URL(p.url)
      const segments = url.pathname.split("/").filter(Boolean)
      const depth = segments.length
      if (depth <= 1) depthBuckets.depth1++
      else if (depth === 2) depthBuckets.depth2++
      else if (depth === 3) depthBuckets.depth3++
      else depthBuckets.depth4plus++

      // Track top-level path prefixes (sections)
      const prefix = segments[0]
      if (prefix) pathPrefixes.set(prefix, (pathPrefixes.get(prefix) ?? 0) + 1)
    } catch {
      depthBuckets.depth1++
    }
  }

  const topSections = [...pathPrefixes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([section, count]) => ({ section: `/${section}`, count }))

  const avgDepth = pages.length > 0
    ? parseFloat((pages.reduce((s, p) => {
        try { return s + new URL(p.url).pathname.split("/").filter(Boolean).length } catch { return s }
      }, 0) / pages.length).toFixed(1))
    : 0

  return NextResponse.json({
    data: {
      auditId: id,
      totalPages: pages.length,
      avgDepth,
      depthDistribution: depthBuckets,
      topSections,
    },
  })
}
