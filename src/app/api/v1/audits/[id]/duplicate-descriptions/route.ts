import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/duplicate-descriptions
 *  Groups pages with identical meta descriptions
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: { auditId: id, duplicateGroups: 0, affectedPages: 0, groups: [] } })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex && p.metaDescription)
  const descMap = new Map<string, string[]>()

  for (const p of pages) {
    const normalised = (p.metaDescription ?? "").trim().toLowerCase()
    if (!normalised || normalised.length < 20) continue
    const group = descMap.get(normalised) ?? []
    group.push(p.url)
    descMap.set(normalised, group)
  }

  const groups = [...descMap.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([description, urls]) => ({ description: description.slice(0, 160), count: urls.length, urls }))
    .sort((a, b) => b.count - a.count)

  const affectedPages = groups.reduce((s, g) => s + g.count, 0)

  return NextResponse.json({
    data: {
      auditId: id,
      duplicateGroups: groups.length,
      affectedPages,
      groups: groups.slice(0, 50),
    },
  })
}
