import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users, type User, type NewUser } from "@/db/schema"

export async function getUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, email) })
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.stripeCustomerId, stripeCustomerId),
  })
}

export async function createUser(data: NewUser): Promise<User> {
  const [row] = await db.insert(users).values(data).returning()
  if (!row) throw new Error("createUser: insert returned no row")
  return row
}

export async function updateUser(
  id: string,
  data: Partial<Omit<NewUser, "id" | "createdAt">>
): Promise<User> {
  const [row] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  if (!row) throw new Error(`updateUser: no user found with id ${id}`)
  return row
}

export async function updateUserSubscription(
  stripeCustomerId: string,
  data: {
    plan: User["plan"]
    subscriptionStatus: User["subscriptionStatus"]
    stripeSubscriptionId: string
    stripePriceId: string
    /* Unix epoch seconds — mirrors Stripe's field exactly; convert to Date for display */
    stripeCurrentPeriodEnd: number
  }
): Promise<void> {
  await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.stripeCustomerId, stripeCustomerId))
}
