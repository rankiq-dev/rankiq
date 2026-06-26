import {
  getSitesByUser,
  getSiteById,
  getSiteByDomain,
  createSite,
  deleteSite,
} from "@/db/repositories/sites"
import { getUserById } from "@/db/repositories/users"
import { PLAN_LIMITS } from "@/lib/constants"
import { logger } from "@/infra/logger"
import type { Site } from "@/db/schema"

export async function listSites(userId: string): Promise<Site[]> {
  return getSitesByUser(userId)
}

export async function addSite(
  userId: string,
  domain: string,
  displayName?: string
): Promise<Site> {
  const user = await getUserById(userId)
  if (!user) throw new Error("User not found")

  /* Enforce plan site limit */
  const existing = await getSitesByUser(userId)
  const limit = PLAN_LIMITS[user.plan].sites
  if (existing.length >= limit) {
    throw Object.assign(
      new Error(`Your ${user.plan} plan allows up to ${limit} site(s). Upgrade to add more.`),
      { code: "PLAN_LIMIT_EXCEEDED" }
    )
  }

  /* Prevent duplicate domain for same user — DB UNIQUE constraint is the hard guard;
     this gives a cleaner error message */
  const existing_domain = await getSiteByDomain(domain, userId)
  if (existing_domain) {
    throw Object.assign(new Error(`${domain} is already added to your account.`), {
      code: "DUPLICATE_DOMAIN",
    })
  }

  const site = await createSite({ userId, domain, displayName })
  logger.info({ userId, domain }, "Site added")
  return site
}

export async function removeSite(siteId: string, userId: string): Promise<void> {
  const site = await getSiteById(siteId, userId)
  if (!site) throw Object.assign(new Error("Site not found"), { code: "NOT_FOUND" })
  await deleteSite(siteId, userId)
  logger.info({ userId, siteId, domain: site.domain }, "Site deleted")
}
