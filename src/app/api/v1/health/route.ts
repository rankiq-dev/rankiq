import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

/** GET /api/v1/health — public health check + API version */
export async function GET() {
  let dbOk = false
  try {
    await db.execute(sql`SELECT 1`)
    dbOk = true
  } catch {
    // db unreachable
  }

  const status = dbOk ? "ok" : "degraded"
  return NextResponse.json(
    {
      status,
      version: "1.0",
      timestamp: new Date().toISOString(),
      services: { db: dbOk ? "ok" : "down" },
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  )
}
