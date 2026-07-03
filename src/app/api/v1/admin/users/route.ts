import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin"
import { getAllUsersForAdmin } from "@/db/repositories/admin"

/** GET /api/v1/admin/users — list all users with plan + usage. Admin-only. */
export async function GET() {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 })
  }

  const rows = await getAllUsersForAdmin()
  return NextResponse.json({ data: rows })
}
