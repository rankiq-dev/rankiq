import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createSiteSchema } from "@/validators/sites"
import { addSite, listSites } from "@/domain/sites/service"
import type { CreateSiteResponse, ListSitesResponse, SiteDto } from "@/lib/types/api"

function toDto(site: {
  id: string; domain: string; displayName: string | null
  gscConnected: boolean; createdAt: Date; updatedAt: Date
}): SiteDto {
  return {
    id: site.id,
    domain: site.domain,
    displayName: site.displayName,
    gscConnected: site.gscConnected,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }
  const sites = await listSites(session.user.id)
  const response: ListSitesResponse = { data: { sites: sites.map(toDto) } }
  return NextResponse.json(response)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createSiteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid domain", details: parsed.error.issues } },
      { status: 400 }
    )
  }

  try {
    const site = await addSite(session.user.id, parsed.data.domain, parsed.data.displayName)
    const response: CreateSiteResponse = { data: { site: toDto(site) } }
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === "PLAN_LIMIT_EXCEEDED") {
      return NextResponse.json({ error: { code: "PLAN_LIMIT_EXCEEDED", message: e.message } }, { status: 403 })
    }
    if (e.code === "DUPLICATE_DOMAIN") {
      return NextResponse.json({ error: { code: "DUPLICATE_DOMAIN", message: e.message } }, { status: 409 })
    }
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed to add site" } }, { status: 500 })
  }
}
