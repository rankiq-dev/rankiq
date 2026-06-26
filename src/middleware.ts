import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authConfig } from "@/auth/config"

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = new Set(["/", "/login", "/pricing", "/register", "/api/auth", "/api/health"])

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith("/api/auth/")) return true
  if (pathname.startsWith("/api/webhooks/")) return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/public/")) return true
  return false
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
