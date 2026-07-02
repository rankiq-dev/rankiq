import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { triggerAuditSchema } from "@/validators/audits"
import { triggerAudit } from "@/domain/audit/service"
import type { TriggerAuditResponse } from "@/lib/types/api"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  // Rate limit: max 10 audit triggers per hour per user
  const rl = checkRateLimit(`audit:${session.user.id}`, 10, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many audit requests. Please wait before triggering another audit." } },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = triggerAuditSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "siteId is required", details: parsed.error.issues } },
      { status: 400 }
    )
  }

  try {
    const audit = await triggerAudit(parsed.data.siteId, session.user.id)
    const response: TriggerAuditResponse = { data: { auditId: audit.id, status: "queued" } }
    return NextResponse.json(response, { status: 202 })
  } catch (err) {
    const e = err as Error
    if (e.message.includes("not found or not owned")) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Site not found" } }, { status: 404 })
    }
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed to trigger audit" } }, { status: 500 })
  }
}
