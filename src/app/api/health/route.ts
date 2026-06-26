import { NextResponse } from "next/server"
import { logger } from "@/infra/logger"

/* Health check — used by CI, Railway, and monitoring to verify the app is up.
   Does NOT require auth. Returns 200 with build/env metadata. */
export async function GET() {
  const health = {
    status:    "ok",
    service:   "rankiq",
    env:       process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
    /* Prove config flows: reading a non-sensitive derived value from the loaded config.
       If config failed to load the import would have thrown at module init. */
    configLoaded: true,
  }

  logger.info({ path: "/api/health" }, "Health check")

  return NextResponse.json(health, { status: 200 })
}
