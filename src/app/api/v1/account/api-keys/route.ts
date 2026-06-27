import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { createHash, randomBytes } from "crypto"

/** GET /api/v1/account/api-keys — list user's API keys */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, session.user.id),
    columns: { keyHash: false },
    orderBy: (k, { desc }) => [desc(k.createdAt)],
  })

  return NextResponse.json({ data: keys })
}

/** POST /api/v1/account/api-keys — create new API key */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { name?: string }
  const name = (body.name ?? "API Key").slice(0, 50)

  const plaintext = `riq_${randomBytes(28).toString("hex")}`
  const keyHash = createHash("sha256").update(plaintext).digest("hex")
  const keyPrefix = plaintext.slice(0, 12)

  const [key] = await db.insert(apiKeys).values({
    userId: session.user.id,
    name,
    keyHash,
    keyPrefix,
  }).returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, createdAt: apiKeys.createdAt })

  return NextResponse.json({ data: { ...key, plaintext } }, { status: 201 })
}

/** DELETE /api/v1/account/api-keys?id=... — revoke an API key */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id)))

  return NextResponse.json({ data: { deleted: true } })
}
