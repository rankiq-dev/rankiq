import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { config } from "@/config"
import { logger } from "@/infra/logger"

/* Next Auth v5 beta: the session callback union type (database vs JWT strategy) is
   not narrowed automatically in TypeScript. We cast to the concrete database shape. */
type DatabaseSessionParams = {
  session: { user: { id?: string }; expires: string }
  user: { id?: string; email?: string }
}

const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      authorization: {
        params: {
          scope: ["openid", "email", "profile"].join(" "),
        },
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session(ctx) {
      const { session, user } = ctx as unknown as DatabaseSessionParams
      if (user?.id) session.user.id = user.id ?? undefined
      return session
    },
  },
  events: {
    signIn({ user }) {
      logger.info({ userId: user.id, email: user.email }, "User signed in")
    },
    signOut() {
      logger.info("User signed out")
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
