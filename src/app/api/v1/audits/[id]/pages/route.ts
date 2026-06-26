import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

export interface PagesResponse {
  data: {
    pages: PageAnalysis[]
    total: number
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audit not found" } }, { status: 404 })
  }

  /* Tenant isolation */
  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audit not found" } }, { status: 404 })
  }

  if (audit.status !== "complete") {
    return NextResponse.json(
      { error: { code: "NOT_READY", message: `Audit is ${audit.status} — page analyses not available yet` } },
      { status: 409 }
    )
  }

  const sortBy = req.nextUrl.searchParams.get("sortBy") ?? "onPageScore"
  const order  = req.nextUrl.searchParams.get("order") ?? "asc"

  const pages = (audit.pageAnalyses as PageAnalysis[] | null) ?? []

  const sorted = [...pages].sort((a, b) => {
    const va = a[sortBy as keyof PageAnalysis] as number ?? 0
    const vb = b[sortBy as keyof PageAnalysis] as number ?? 0
    return order === "desc" ? vb - va : va - vb
  })

  const response: PagesResponse = { data: { pages: sorted, total: sorted.length } }
  return NextResponse.json(response)
}
