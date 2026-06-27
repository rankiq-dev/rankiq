import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { audits } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { randomBytes } from "crypto"

/** POST /api/v1/audits/:id/share — generate or revoke a public share token */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { revoke?: boolean }

  if (body.revoke) {
    await db.update(audits).set({ shareToken: null }).where(eq(audits.id, id))
    return NextResponse.json({ data: { shareToken: null } })
  }

  const token = randomBytes(20).toString("hex")
  await db.update(audits).set({ shareToken: token }).where(eq(audits.id, id))

  return NextResponse.json({ data: { shareToken: token } })
}
