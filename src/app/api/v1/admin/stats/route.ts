import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin"
import { getPlatformStats } from "@/db/repositories/admin"

/** GET /api/v1/admin/stats — platform-wide usage stats. Admin-only. */
export async function GET() {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 })
  }

  const stats = await getPlatformStats()
  return NextResponse.json({ data: stats })
}
