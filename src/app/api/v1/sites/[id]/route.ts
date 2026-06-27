import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { removeSite } from "@/domain/sites/service"
import { getSiteById, updateSite } from "@/db/repositories/sites"
import type { DeleteSiteResponse } from "@/lib/types/api"

/** PATCH /api/v1/sites/:id — update mutable site fields (displayName) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { displayName?: string | null }

  await updateSite(id, session.user.id, { displayName: body.displayName ?? null })

  return NextResponse.json({ data: { updated: true } })
}

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
