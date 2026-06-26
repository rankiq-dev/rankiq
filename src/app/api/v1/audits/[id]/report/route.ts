import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { sendAuditReportEmail } from "@/domain/email/service"

/** POST /api/v1/audits/:id/report — Send the audit report email for a completed audit */
export async function POST(
  _req: NextRequest,
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
      { error: { code: "AUDIT_INCOMPLETE", message: "Report can only be sent for completed audits" } },
      { status: 409 }
    )
  }

  await sendAuditReportEmail(id, session.user.id)
  return NextResponse.json({ data: { sent: true } })
}
