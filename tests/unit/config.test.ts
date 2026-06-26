import { describe, it, expect } from "vitest"

describe("config loader", () => {
  it("loads successfully with test env vars (set in setup.ts)", async () => {
    /* Dynamic import so setup.ts env vars are set first */
    const { config } = await import("@/config")
    expect(config.nodeEnv).toBe("test")
    expect(config.appUrl).toBe("http://localhost:3000")
  })

  it("config flows — appUrl default is correct", async () => {
    const { config } = await import("@/config")
    expect(config.appUrl).toMatch(/^https?:\/\//)
  })
})

describe("config guard — known-constant check", () => {
  it("guard is skipped in test mode (NODE_ENV=test)", async () => {
    /* If the guard fired in test mode this import would throw */
    const { config } = await import("@/config")
    expect(config).toBeDefined()
  })
})
