import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { users, accounts, sessions, verificationTokens } from "@/db/schema"
import { authConfig } from "./config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // @ts-ignore — our schema uses camelCase JS names mapping to snake_case DB columns; works at runtime
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  /* Ensure cookies work on the real deployed domain, not just localhost.
   * When NEXTAUTH_URL is localhost but the app runs on a real domain,
   * AUTH_TRUST_HOST=true + useSecureCookies on production fixes the session cookie. */
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string
      return session
    },
  },
})
