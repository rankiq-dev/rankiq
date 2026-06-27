import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

/**
 * Edge-safe auth config — no DB adapter, no Node.js APIs.
 * Used by middleware to check if a session cookie exists (JWT-readable).
 * The full config with DrizzleAdapter lives in src/auth/index.ts.
 */
const isProd = process.env.NODE_ENV === "production"

export const authConfig: NextAuthConfig = {
  /* trustHost is set via AUTH_TRUST_HOST=true env var in Vercel.
   * Do NOT set it to true in code — it causes NextAuth to trust the
   * x-forwarded-host header which can override AUTH_URL unexpectedly. */
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  /* Cookie config must live here (shared config) so the middleware and the
   * auth handler both read/write the exact same cookie name and flags.
   * Mismatch between the two causes the "always redirects to login" loop. */
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProd,
      },
    },
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
  },
}
