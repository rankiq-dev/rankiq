import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { removeSite } from "@/domain/sites/service"
import type { DeleteSiteResponse } from "@/lib/types/api"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const { id } = await params

  try {
    await removeSite(id, session.user.id)
    const response: DeleteSiteResponse = { data: { deleted: true } }
    return NextResponse.json(response)
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Site not found" } }, { status: 404 })
    }
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed to delete site" } }, { status: 500 })
  }
}
