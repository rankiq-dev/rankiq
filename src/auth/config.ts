import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

/**
 * Edge-safe auth config — no DB adapter, no Node.js APIs.
 * Used by middleware to check if a session cookie exists (JWT-readable).
 * The full config with DrizzleAdapter lives in src/auth/index.ts.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
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
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
  },
}
