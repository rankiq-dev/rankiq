import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/pages-export — CSV download of all crawled pages */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const pages = (audit.pageAnalyses as PageAnalysis[] | null) ?? []

  const esc = (s: string | null | undefined) => `"${(s ?? "").replace(/"/g, '""')}"`

  const header = ["URL", "Status", "Title", "H1", "Word Count", "On-Page Score", "Incoming Links", "Has Canonical", "Has JSON-LD", "Images Missing Alt"]
  const rows = pages.map(p => [
    esc(p.url),
    p.isNoindex ? "noindex" : "index",
    esc(p.title),
    esc(p.h1Text),
    p.wordCount,
    p.onPageScore,
    p.incomingInternalLinks,
    p.hasCanonical ? "Yes" : "No",
    p.hasJsonLd ? "Yes" : "No",
    p.imagesMissingAlt,
  ])

  const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\r\n")
  const filename = `rankiq-pages-${site.domain}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
