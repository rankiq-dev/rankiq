import type { MetadataRoute } from "next"
import { config } from "@/config"
import { db } from "@/db"
import { audits } from "@/db/schema"
import { isNotNull } from "drizzle-orm"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.appUrl
  const now  = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ]

  /* Include publicly shared audit pages */
  let sharedAudits: MetadataRoute.Sitemap = []
  try {
    const shared = await db.query.audits.findMany({
      where: isNotNull(audits.shareToken),
      columns: { shareToken: true, completedAt: true },
      limit: 500,
    })
    sharedAudits = shared.map(a => ({
      url: `${base}/share/${a.shareToken!}`,
      lastModified: a.completedAt ?? now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))
  } catch { /* ignore db errors in sitemap */ }

  return [...staticPages, ...sharedAudits]
}
