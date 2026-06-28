export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import { getSitesByUser } from "@/db/repositories/sites"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { PLAN_LIMITS } from "@/lib/constants"
import { NotificationSettings } from "./NotificationSettings"
import { ApiKeyManager } from "./ApiKeyManager"
import { WebhookManager } from "./WebhookManager"
import { db } from "@/db"
import { apiKeys, webhooks, audits } from "@/db/schema"
import { eq, and, gte, inArray } from "drizzle-orm"

export const metadata: Metadata = { title: "Account" }

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, sites, userApiKeys, userWebhooks] = await Promise.all([
    getUserById(session.user.id),
    getSitesByUser(session.user.id),
    db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, session.user.id),
      columns: { keyHash: false },
      orderBy: (k, { desc }) => [desc(k.createdAt)],
    }),
    db.query.webhooks.findMany({
      where: eq(webhooks.userId, session.user.id),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    }),
  ])
  if (!user) redirect("/login")

  // Count audits in the last 30 days
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const siteIds = sites.map(s => s.id)
  const audits30d = siteIds.length > 0
    ? await db.query.audits.findMany({
        where: and(inArray(audits.siteId, siteIds), gte(audits.createdAt, since30d)),
        columns: { id: true, status: true },
      })
    : []
  const completedAudits30d = audits30d.filter(a => a.status === "complete").length

  const limits = PLAN_LIMITS[user.plan]
  const planColor = user.plan === "agency" ? "var(--primary-2)" : user.plan === "growth" ? "var(--success)" : "var(--foreground-2)"
  const planBg = user.plan === "agency" ? "var(--primary-soft)" : user.plan === "growth" ? "var(--success-bg)" : "oklch(0.18 0.006 230)"
  const planBorder = user.plan === "agency" ? "oklch(0.55 0.13 178 / 0.3)" : user.plan === "growth" ? "oklch(0.68 0.16 155 / 0.3)" : "var(--glass-border)"

  return (
    <div style={{ padding: "32px 40px", maxWidth: "720px" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginBottom: "6px" }}>Account</h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>Manage your account and subscription</p>
      </div>

      {/* Profile card */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "24px 28px", marginBottom: "16px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
          Profile
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" width={52} height={52}
              style={{ borderRadius: "50%", border: "2px solid var(--primary-glow)", flexShrink: 0 }} />
          ) : (
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "var(--primary-soft)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "20px", fontWeight: 700,
              color: "var(--primary-2)", border: "2px solid var(--primary-glow)", flexShrink: 0,
            }}>
              {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)", marginBottom: "3px" }}>{user.name ?? "—"}</div>
            <div style={{ fontSize: "13px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>{user.email}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "4px 12px", borderRadius: "20px",
              background: planBg, border: `1px solid ${planBorder}`,
              fontSize: "11px", fontWeight: 700, color: planColor,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: planColor }} />
              {user.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Plan details */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "24px 28px", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Plan & Limits
          </div>
          {user.plan !== "agency" && (
            <Link href="/pricing" style={{
              padding: "6px 14px", fontSize: "11px", fontWeight: 700,
              background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
              color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
              textDecoration: "none", boxShadow: "var(--shadow-glow)",
            }}>Upgrade →</Link>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <LimitCard label="Sites" used={sites.length} max={limits.sites} />
          <LimitCard label="Pages / crawl" used={null} max={limits.pagesPerCrawl} />
          <LimitCard label="Audits this month" used={completedAudits30d} max={limits.auditsPerMonth} />
        </div>
      </div>

      {/* Features */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "24px 28px", marginBottom: "16px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
          Features Included
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            { label: "Technical SEO audit", included: true },
            { label: "On-page analysis", included: true },
            { label: "AI action plan", included: true },
            { label: "Competitor analysis", included: true },
            { label: "PDF reports", included: true },
            { label: "Google Search Console", included: user.plan !== "starter" },
            { label: "Weekly auto-audits", included: user.plan !== "starter" },
            { label: "Agency multi-site view", included: user.plan === "agency" || sites.length > 1 },
          ].map(f => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ color: f.included ? "var(--success)" : "var(--border-strong)", fontSize: "12px" }}>
                {f.included ? "✓" : "–"}
              </span>
              <span style={{ color: f.included ? "var(--foreground)" : "var(--foreground-3)" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification preferences */}
      <div style={{ marginBottom: "16px" }}>
        <NotificationSettings
          notifyAuditComplete={user.notifyAuditComplete ?? true}
          notifyWeeklyDigest={user.notifyWeeklyDigest ?? true}
          notifyCriticalOnly={user.notifyCriticalOnly ?? false}
        />
      </div>

      {/* API keys */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "24px 28px", marginBottom: "16px",
      }}>
        <ApiKeyManager initialKeys={userApiKeys.map(k => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
          createdAt: k.createdAt.toISOString(),
        }))} />
      </div>

      {/* Webhooks */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "24px 28px", marginBottom: "16px",
      }}>
        <WebhookManager initialWebhooks={userWebhooks.map(w => ({
          id: w.id,
          url: w.url,
          secret: `${w.secret.slice(0, 8)}…`,
          events: w.events,
          isActive: w.isActive,
          lastFiredAt: w.lastFiredAt?.toISOString() ?? null,
          lastStatus: w.lastStatus ?? null,
          failureCount: w.failureCount,
        }))} />
      </div>

      {/* Sign out */}
      <div style={{
        background: "var(--destructive-bg)", backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.20 27 / 0.2)", borderRadius: "var(--radius-xl)",
        padding: "20px 28px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
          Sign Out
        </div>
        <p style={{ fontSize: "12px", color: "var(--foreground-3)", marginBottom: "14px", lineHeight: 1.6 }}>
          You&apos;ll be redirected to the login page.
        </p>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" style={{
            padding: "8px 18px", fontSize: "12px", fontWeight: 700,
            background: "transparent", color: "var(--destructive)",
            border: "1px solid oklch(0.65 0.20 27 / 0.4)", borderRadius: "var(--radius-md)",
            cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
          }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

function LimitCard({ label, used, max }: { label: string; used: number | null; max: number }) {
  const pct = used != null ? Math.min(100, Math.round((used / max) * 100)) : null
  const color = pct == null ? "var(--primary-2)" : pct >= 90 ? "var(--destructive)" : pct >= 70 ? "var(--warning)" : "var(--success)"

  return (
    <div style={{
      background: "oklch(0.14 0.006 230)", borderRadius: "var(--radius-lg)", padding: "14px 16px",
      border: "1px solid var(--glass-border)",
    }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: pct != null ? "8px" : 0 }}>
        {used != null && <span style={{ fontSize: "20px", fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>{used}</span>}
        <span style={{ fontSize: used != null ? "12px" : "20px", fontWeight: used != null ? 500 : 800, color: used != null ? "var(--foreground-3)" : color, fontFamily: "var(--font-mono)" }}>
          {used != null ? `/ ${max}` : max.toLocaleString()}
        </span>
      </div>
      {pct != null && (
        <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px" }} />
        </div>
      )}
    </div>
  )
}
