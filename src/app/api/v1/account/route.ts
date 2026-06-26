import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import type { GetAccountResponse } from "@/lib/types/api"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const user = await getUserById(session.user.id)
  if (!user) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 })
  }

  const response: GetAccountResponse = {
    data: {
      account: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus ?? null,
        stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd ?? null,
      },
    },
  }

  return NextResponse.json(response)
}
