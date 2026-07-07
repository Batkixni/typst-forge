import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { findUser, createUser, getUserCount, getSettings } from "./db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        if (user?.id) {
          const existing = findUser(user.id)
          if (!existing) {
            createUser(user.id, user.name || "Unknown", user.image || null)
          }
        }
      } catch {}
      return true
    },
    async jwt({ token, account, user }) {
      try {
        if (account?.access_token) {
          token.accessToken = account.access_token
        }
        const uid = user?.id || token.sub
        if (uid) {
          const existing = findUser(uid)
          if (existing) {
            token.role = existing.role
            delete token.pending
          } else if (user) {
            const isFirst = getUserCount() === 0
            const settings = getSettings()
            if (isFirst || settings.allowRegistration) {
              const created = createUser(uid, user.name || "Unknown", user.image || null)
              token.role = created.role
              delete token.pending
            } else {
              token.pending = true
            }
          }
        }
      } catch {}
      return token
    },
    async session({ session, token }) {
      try {
        session.accessToken = token.accessToken as string
        session.user.role = token.role as string | undefined
        session.pending = token.pending as boolean | undefined
      } catch {}
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/?error=AccessDenied",
  },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string
    pending?: boolean
    user: {
      role?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string
    role?: string
    pending?: boolean
  }
}
