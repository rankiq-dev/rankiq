/** Admin allowlist — comma-separated emails in ADMIN_EMAILS env var.
 *  Falls back to the founder email if unset so admin access always works. */
const FALLBACK_ADMIN = "pradyudass@gmail.com"

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim()
  if (!raw) return new Set([FALLBACK_ADMIN])
  return new Set(raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().has(email.toLowerCase())
}
