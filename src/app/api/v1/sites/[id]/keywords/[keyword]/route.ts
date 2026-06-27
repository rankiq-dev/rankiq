import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordHistory } from "@/db/repositories/gsc"

/** GET /api/v1/sites/:id/keywords/:keyword — position history for a single keyword */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; keyword: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, keyword } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const history = await getKeywordHistory(id, decodeURIComponent(keyword))
  return NextResponse.json({ data: history })
}
