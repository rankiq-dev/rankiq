import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import { createCheckoutSession } from "@/providers/billing"
import { config } from "@/config"
import { logger } from "@/infra/logger"

const bodySchema = z.object({
  plan: z.enum(["growth", "agency"]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.issues } },
      { status: 400 }
    )
  }

  const user = await getUserById(session.user.id)
  if (!user) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 })
  }

  try {
    const result = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan: parsed.data.plan,
      successUrl: `${config.appUrl}/dashboard?upgraded=1`,
      cancelUrl:  `${config.appUrl}/pricing`,
    })
    return NextResponse.json({ data: { url: result.url } })
  } catch (err) {
    logger.error({ err }, "Failed to create checkout session")
    return NextResponse.json(
      { error: { code: "BILLING_ERROR", message: "Could not create checkout session" } },
      { status: 500 }
    )
  }
}
