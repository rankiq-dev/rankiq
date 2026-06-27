import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

/** GET /api/status — public uptime check; does not require auth */
export async function GET() {
  const start = Date.now()
  let dbOk = false

  try {
    await db.execute(sql`SELECT 1`)
    dbOk = true
  } catch {
    // DB unreachable — still return 200 so load balancer doesnt restart; rely on detail for alerting
  }

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      checks: { db: dbOk ? "ok" : "error" },
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  )
}
