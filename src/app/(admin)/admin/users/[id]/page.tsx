export const dynamic = "force-dynamic"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getUserDetailForAdmin } from "@/db/repositories/admin"
import { PLAN_LIMITS } from "@/lib/constants"
import { UserPlanEditor } from "./UserPlanEditor"

export const metadata: Metadata = { title: "Admin · User Detail" }

export default async function AdminUserDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getUserDetailForAdmin(id)
  if (!detail) notFound()

  const { user, sites } = detail
  const limits = PLAN_LIMITS[user.plan]

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1100px" }}>
      <Link href="/admin/users" style={{ fontSize: "12px", color: "oklch(0.55 0.008 25)", textDecoration: "none" }}>
        ← All users
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "14px", marginBottom: "28px" }}>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" width={56} height={56} style={{ borderRadius: "50%" }} />
        ) : (
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "oklch(0.55 0.20 27 / 0.15)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontWeight: 700, color: "oklch(0.70 0.20 27)",
          }}>
            {(user.name ?? user.email)[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.4px" }}>{user.name ?? "Unnamed user"}</h1>
          <div style={{ fontSize: "13px", color: "oklch(0.55 0.008 25)" }}>{user.email}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Plan management */}
        <div style={{
          background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
          borderRadius: "14px", padding: "18px 20px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.55 0.008 25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
            Plan
          </div>
          <UserPlanEditor userId={user.id} currentPlan={user.plan} />
          <div style={{ marginTop: "14px", fontSize: "11px", color: "oklch(0.50 0.008 25)", display: "flex", flexDirection: "column", gap: "3px" }}>
            <span>Limit: {limits.sites} sites · {limits.pagesPerCrawl} pages/crawl · {limits.auditsPerMonth} audits/mo</span>
            <span>Subscription status: {user.subscriptionStatus ?? "none (no Stripe subscription)"}</span>
            {user.stripeCustomerId && <span>Stripe customer: {user.stripeCustomerId}</span>}
          </div>
        </div>

        {/* Account meta */}
        <div style={{
          background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
          borderRadius: "14px", padding: "18px 20px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.55 0.008 25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
            Account
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
            <MetaRow label="User ID" value={user.id} mono />
            <MetaRow label="Joined" value={new Date(user.createdAt).toLocaleString()} />
            <MetaRow label="Sites" value={String(sites.length)} />
            <MetaRow label="Notifications" value={
              [
                user.notifyAuditComplete && "audit complete",
                user.notifyWeeklyDigest && "weekly digest",
                user.notifyCriticalOnly && "critical only",
              ].filter(Boolean).join(", ") || "none"
            } />
          </div>
        </div>
      </div>

      {/* Sites */}
      <div style={{
        background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid oklch(0.30 0.05 25 / 0.3)", fontSize: "13px", fontWeight: 700 }}>
          Sites ({sites.length})
        </div>
        {sites.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "oklch(0.45 0.008 25)", fontSize: "13px" }}>
            No sites added yet.
          </div>
        ) : (
          sites.map(s => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderBottom: "1px solid oklch(0.30 0.05 25 / 0.15)",
            }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{s.displayName ?? s.domain}</div>
                <div style={{ fontSize: "11px", color: "oklch(0.55 0.008 25)" }}>{s.domain}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "12px" }}>
                <span style={{ color: "oklch(0.55 0.008 25)" }}>{s.auditCount} audits</span>
                {s.latestHealthScore != null && (
                  <span style={{
                    fontWeight: 700, fontFamily: "var(--font-mono)",
                    color: s.latestHealthScore >= 80 ? "oklch(0.70 0.15 145)" : s.latestHealthScore >= 50 ? "oklch(0.75 0.14 75)" : "oklch(0.65 0.20 27)",
                  }}>
                    {s.latestHealthScore}/100
                  </span>
                )}
                <span style={{ color: "oklch(0.45 0.008 25)" }}>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <span style={{ color: "oklch(0.55 0.008 25)" }}>{label}</span>
      <span style={{ color: "oklch(0.85 0.008 25)", fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: mono ? "11px" : "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
        {value}
      </span>
    </div>
  )
}
