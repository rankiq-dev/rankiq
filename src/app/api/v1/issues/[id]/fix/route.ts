import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, markIssueFixed } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { db } from "@/db"
import { auditIssues } from "@/db/schema"
import { eq } from "drizzle-orm"

/** PATCH /api/v1/issues/:id/fix — Mark an issue as fixed (or unmark it) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const { id } = await params

  /* Load issue to find its audit (and from there its site — tenant isolation) */
  const [issue] = await db.select().from(auditIssues).where(eq(auditIssues.id, id)).limit(1)
  if (!issue) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Issue not found" } }, { status: 404 })
  }

  const audit = await getAuditById(issue.auditId)
  if (!audit) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audit not found" } }, { status: 404 })
  }

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Issue not found" } }, { status: 404 })
  }

  let body: { fixed?: boolean; assignedTo?: string; fixNote?: string } = {}
  try { body = await req.json() } catch { /* no body = default to marking fixed */ }
  const markFixed = body.fixed !== false

  const updated = await markIssueFixed(id, markFixed, {
    assignedTo: body.assignedTo,
    fixNote: body.fixNote,
  })

  return NextResponse.json({ data: { id, isFixed: markFixed, assignedTo: updated.assignedTo, fixNote: updated.fixNote } })
}
