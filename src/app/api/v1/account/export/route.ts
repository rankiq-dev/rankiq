import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import { getSitesByUser } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/account/export — download all user data as JSON */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getUserById(session.user.id)
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const sites = await getSitesByUser(session.user.id)
  const sitesWithAudits = await Promise.all(
    sites.map(async (site) => {
      const audits = await getAuditsForSite(site.id)
      return {
        id: site.id,
        domain: site.domain,
        displayName: site.displayName,
        gscConnected: site.gscConnected,
        auditSchedule: site.auditSchedule,
        createdAt: site.createdAt,
        audits: audits.map(a => ({
          id: a.id,
          status: a.status,
          healthScore: a.healthScore,
          pagesCount: a.pagesCount,
          createdAt: a.createdAt,
          completedAt: a.completedAt,
        })),
      }
    })
  )

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    },
    sites: sitesWithAudits,
  }

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="rankiq-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
