import { and, eq, desc } from "drizzle-orm"
import { db } from "@/db"
import { sites, type Site, type NewSite } from "@/db/schema"

export async function getSiteById(id: string, userId: string): Promise<Site | undefined> {
  return db.query.sites.findFirst({
    where: and(eq(sites.id, id), eq(sites.userId, userId)),
  })
}

export async function getSitesByUser(userId: string): Promise<Site[]> {
  return db.query.sites.findMany({
    where: eq(sites.userId, userId),
    orderBy: [desc(sites.createdAt)],
  })
}

export async function getSiteByDomain(
  domain: string,
  userId: string
): Promise<Site | undefined> {
  return db.query.sites.findFirst({
    where: and(eq(sites.domain, domain), eq(sites.userId, userId)),
  })
}

export async function createSite(data: NewSite): Promise<Site> {
  const [row] = await db.insert(sites).values(data).returning()
  if (!row) throw new Error("createSite: insert returned no row")
  return row
}

export async function updateSite(
  id: string,
  userId: string,
  data: Partial<Omit<NewSite, "id" | "userId" | "createdAt">>
): Promise<Site> {
  const [row] = await db
    .update(sites)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sites.id, id), eq(sites.userId, userId)))
    .returning()
  if (!row) throw new Error(`updateSite: no site found with id ${id} for user ${userId}`)
  return row
}

export async function deleteSite(id: string, userId: string): Promise<void> {
  await db.delete(sites).where(and(eq(sites.id, id), eq(sites.userId, userId)))
}
