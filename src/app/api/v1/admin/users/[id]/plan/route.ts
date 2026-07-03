import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin"
import { updateUser, getUserById } from "@/db/repositories/users"

const VALID_PLANS = new Set(["starter", "growth", "agency"])

/** PATCH /api/v1/admin/users/:id/plan — manually set a user's plan. Admin-only.
 *  For support/testing (e.g. comping an account) — does NOT touch Stripe. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 })
  }

  const { id } = await params
  const target = await getUserById(id)
  if (!target) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 })
  }

  let body: { plan?: string } = {}
  try { body = await req.json() } catch { /* invalid body handled below */ }

  if (!body.plan || !VALID_PLANS.has(body.plan)) {
    return NextResponse.json({ error: { code: "INVALID_PLAN", message: "plan must be starter, growth, or agency" } }, { status: 400 })
  }

  const updated = await updateUser(id, { plan: body.plan as "starter" | "growth" | "agency" })
  return NextResponse.json({ data: { id: updated.id, plan: updated.plan } })
}
