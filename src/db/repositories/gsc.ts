import { eq, desc, and } from "drizzle-orm"
import { db } from "@/db"
import { gscKeywordMetrics, type GscKeywordMetric, type NewGscKeywordMetric } from "@/db/schema"

export async function getKeywordMetricsBySite(
  siteId: string,
  limit = 50
): Promise<GscKeywordMetric[]> {
  /* Return the most recent snapshot only */
  const latest = await db.query.gscKeywordMetrics.findFirst({
    where: eq(gscKeywordMetrics.siteId, siteId),
    orderBy: [desc(gscKeywordMetrics.dateRangeEnd)],
    columns: { dateRangeEnd: true },
  })
  if (!latest) return []

  return db.query.gscKeywordMetrics.findMany({
    where: and(
      eq(gscKeywordMetrics.siteId, siteId),
      eq(gscKeywordMetrics.dateRangeEnd, latest.dateRangeEnd),
    ),
    orderBy: [desc(gscKeywordMetrics.clicks)],
    limit,
  })
}

/**
 * Returns keywords with position change vs. previous snapshot.
 * Useful for rank tracking trend view.
 */
export async function getKeywordPositionChanges(siteId: string, limit = 25): Promise<Array<GscKeywordMetric & { prevPosition: string | null; positionChange: number | null }>> {
  /* Get the 2 most recent distinct snapshot dates */
  const allDates = await db
    .selectDistinct({ date: gscKeywordMetrics.dateRangeEnd })
    .from(gscKeywordMetrics)
    .where(eq(gscKeywordMetrics.siteId, siteId))
    .orderBy(desc(gscKeywordMetrics.dateRangeEnd))
    .limit(2)

  if (allDates.length === 0) return []

  const latestDate = allDates[0]!.date
  const prevDate = allDates[1]?.date ?? null

  const latest = await db.query.gscKeywordMetrics.findMany({
    where: and(
      eq(gscKeywordMetrics.siteId, siteId),
      eq(gscKeywordMetrics.dateRangeEnd, latestDate),
    ),
    orderBy: [desc(gscKeywordMetrics.clicks)],
    limit,
  })

  if (!prevDate) {
    return latest.map(r => ({ ...r, prevPosition: null, positionChange: null }))
  }

  const prev = await db.query.gscKeywordMetrics.findMany({
    where: and(
      eq(gscKeywordMetrics.siteId, siteId),
      eq(gscKeywordMetrics.dateRangeEnd, prevDate),
    ),
  })
  const prevMap = new Map(prev.map(r => [r.keyword, r.positionAvg]))

  return latest.map(r => {
    const prevPos = prevMap.get(r.keyword) ?? null
    const change = prevPos != null
      ? Math.round((Number(prevPos) - Number(r.positionAvg)) * 10) / 10
      : null
    return { ...r, prevPosition: prevPos, positionChange: change }
  })
}

export async function deleteKeywordMetricsBySite(siteId: string): Promise<void> {
  await db.delete(gscKeywordMetrics).where(eq(gscKeywordMetrics.siteId, siteId))
}

/** Delete only the snapshot for a specific dateRangeEnd (for same-day re-import) */
export async function deleteKeywordMetricsByDate(siteId: string, dateRangeEnd: string): Promise<void> {
  await db.delete(gscKeywordMetrics).where(
    and(
      eq(gscKeywordMetrics.siteId, siteId),
      eq(gscKeywordMetrics.dateRangeEnd, dateRangeEnd),
    )
  )
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
