import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { getUserById } from "@/db/repositories/users"
import { generateAuditPdf } from "@/domain/pdf/auditReport"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [site, user] = await Promise.all([
    getSiteById(audit.siteId, session.user.id),
    getUserById(session.user.id),
  ])
  if (!site) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (audit.status !== "complete") {
    return NextResponse.json({ error: "Audit not complete yet" }, { status: 400 })
  }

  // White-label: agency plan users can pass ?agency=AgencyName to brand the PDF
  const rawAgency = new URL(req.url).searchParams.get("agency")
  const agencyName = user?.plan === "agency" && rawAgency
    ? rawAgency.slice(0, 60).replace(/[<>"']/g, "")
    : undefined

  const issues = await getIssuesByAudit(audit.id, { limit: 50 })
  const pdf = await generateAuditPdf(site, audit, issues, agencyName)

  const brand = agencyName ?? "rankiq"
  const domain = site.displayName ?? site.domain
  const date = audit.completedAt ? new Date(audit.completedAt).toISOString().slice(0, 10) : "report"
  const filename = `${brand}-audit-${domain}-${date}.pdf`

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdf.length.toString(),
    },
  })
}
