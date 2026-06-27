import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateUser } from "@/db/repositories/users"

/** PATCH /api/v1/account/notifications — update email notification preferences */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    notifyAuditComplete?: boolean
    notifyWeeklyDigest?: boolean
    notifyCriticalOnly?: boolean
  }

  const update: Record<string, boolean> = {}
  if (typeof body.notifyAuditComplete === "boolean") update.notifyAuditComplete = body.notifyAuditComplete
  if (typeof body.notifyWeeklyDigest === "boolean") update.notifyWeeklyDigest = body.notifyWeeklyDigest
  if (typeof body.notifyCriticalOnly === "boolean") update.notifyCriticalOnly = body.notifyCriticalOnly

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 })

  await updateUser(session.user.id, update)

  return NextResponse.json({ data: { updated: true } })
}
