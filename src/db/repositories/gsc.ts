import { and, eq, desc } from "drizzle-orm"
import { db } from "@/db"
import { gscKeywordMetrics, type GscKeywordMetric, type NewGscKeywordMetric } from "@/db/schema"

export async function getKeywordMetricsBySite(
  siteId: string,
  limit = 50
): Promise<GscKeywordMetric[]> {
  return db.query.gscKeywordMetrics.findMany({
    where: eq(gscKeywordMetrics.siteId, siteId),
    orderBy: [desc(gscKeywordMetrics.clicks)],
    limit,
  })
}

export async function deleteKeywordMetricsBySite(siteId: string): Promise<void> {
  await db.delete(gscKeywordMetrics).where(eq(gscKeywordMetrics.siteId, siteId))
}

export async function bulkInsertKeywordMetrics(rows: NewGscKeywordMetric[]): Promise<void> {
  if (rows.length === 0) return
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(gscKeywordMetrics).values(rows.slice(i, i + BATCH))
  }
}

export async function getLatestMetricDate(siteId: string): Promise<string | null> {
  const row = await db.query.gscKeywordMetrics.findFirst({
    where: eq(gscKeywordMetrics.siteId, siteId),
    orderBy: [desc(gscKeywordMetrics.dateRangeEnd)],
    columns: { dateRangeEnd: true },
  })
  return row?.dateRangeEnd ?? null
}
