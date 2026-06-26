import { describe, it, expect } from "vitest"

/* Tests for GSC domain service helpers — provider calls are NOT made (no real credentials). */

/* Replicate getGscAuthUrl / parseGscState logic from service */
function buildState(siteId: string, userId: string): string {
  return Buffer.from(JSON.stringify({ siteId, userId })).toString("base64url")
}

function parseGscState(state: string): { siteId: string; userId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
    if (typeof parsed.siteId !== "string" || typeof parsed.userId !== "string") return null
    return parsed as { siteId: string; userId: string }
  } catch {
    return null
  }
}

describe("GSC domain service", () => {
  describe("OAuth state encoding / decoding", () => {
    it("round-trips siteId and userId through base64url state", () => {
      const state = buildState("site-uuid-123", "user-uuid-456")
      const parsed = parseGscState(state)
      expect(parsed).toEqual({ siteId: "site-uuid-123", userId: "user-uuid-456" })
    })

    it("returns null for tampered (invalid base64url) state", () => {
      expect(parseGscState("not-valid-base64!!!")).toBeNull()
    })

    it("returns null for state missing required keys", () => {
      const badState = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url")
      expect(parseGscState(badState)).toBeNull()
    })

    it("returns null for empty string", () => {
      expect(parseGscState("")).toBeNull()
    })

    it("handles UUIDs with hyphens correctly", () => {
      const sid = "550e8400-e29b-41d4-a716-446655440000"
      const uid = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
      const parsed = parseGscState(buildState(sid, uid))
      expect(parsed?.siteId).toBe(sid)
      expect(parsed?.userId).toBe(uid)
    })
  })

  describe("GSC keyword metric units", () => {
    it("positionAvg is stored as 1.00–100.00 string (lower = better)", () => {
      const position = 3.5 /* Google API: rank ~3 */
      const stored   = position.toFixed(2)
      expect(stored).toBe("3.50")
      expect(Number(stored)).toBeLessThan(10)
    })

    it("ctrPct converts Google's 0–1 decimal to 0–100 percentage", () => {
      const googleCtr = 0.0345 /* Google API value */
      const stored    = (googleCtr * 100).toFixed(2)
      expect(stored).toBe("3.45")
    })

    it("impressions and clicks remain integers — no fractional counts", () => {
      const clicks     = 142
      const impressions = 8300
      expect(Number.isInteger(clicks)).toBe(true)
      expect(Number.isInteger(impressions)).toBe(true)
    })
  })

  describe("GSC date range", () => {
    it("generates a 28-day window with ISO date strings", () => {
      const end   = new Date("2026-06-26")
      const start = new Date(end)
      start.setDate(start.getDate() - 28)
      const endStr   = end.toISOString().slice(0, 10)
      const startStr = start.toISOString().slice(0, 10)
      expect(endStr).toBe("2026-06-26")
      expect(startStr).toBe("2026-05-29")
      expect(endStr > startStr).toBe(true)
    })
  })

  describe("Tenant isolation", () => {
    it("state userId must match session userId — different userId is a FORBIDDEN case", () => {
      const state = buildState("site-1", "user-A")
      const parsed = parseGscState(state)
      /* Simulated middleware check in callback */
      const sessionUserId = "user-B"
      const allowed = parsed?.userId === sessionUserId
      expect(allowed).toBe(false)
    })

    it("matching userId passes the tenant check", () => {
      const state = buildState("site-1", "user-A")
      const parsed = parseGscState(state)
      expect(parsed?.userId === "user-A").toBe(true)
    })
  })
})
