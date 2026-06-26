import { describe, it, expect } from "vitest"
import { cn, truncate, normalizeUrl, slugify } from "@/lib/utils"

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })
  it("resolves tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })
})

describe("truncate()", () => {
  it("leaves short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello")
  })
  it("truncates long strings with ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello w…")
  })
})

describe("normalizeUrl()", () => {
  it("strips www and protocol", () => {
    expect(normalizeUrl("https://www.example.com")).toBe("example.com")
  })
  it("adds https if missing", () => {
    expect(normalizeUrl("example.com")).toBe("example.com")
  })
})

describe("slugify()", () => {
  it("converts to slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world")
  })
})
