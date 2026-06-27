import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { webhooks } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { randomBytes } from "crypto"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const list = await db.query.webhooks.findMany({ where: eq(webhooks.userId, session.user.id) })
  return NextResponse.json({ data: list.map(w => ({ ...w, secret: `${w.secret.slice(0, 8)}…` })) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { url?: string; events?: string }
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 })

  const existing = await db.query.webhooks.findMany({ where: eq(webhooks.userId, session.user.id) })
  if (existing.length >= 10) return NextResponse.json({ error: "Max 10 webhooks per account" }, { status: 400 })

  const secret = randomBytes(24).toString("hex")
  const events = body.events ?? "audit.complete"

  const [wh] = await db.insert(webhooks).values({
    userId: session.user.id,
    url: body.url,
    secret,
    events,
  }).returning()

  return NextResponse.json({ data: { ...wh, secret } }) // return full secret once
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.userId, session.user.id)))
  return NextResponse.json({ data: { deleted: true } })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { id?: string; isActive?: boolean }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await db.update(webhooks).set({ isActive: body.isActive ?? true }).where(and(eq(webhooks.id, body.id), eq(webhooks.userId, session.user.id)))
  return NextResponse.json({ data: { updated: true } })
}
