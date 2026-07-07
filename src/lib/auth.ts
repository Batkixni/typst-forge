import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { findUser, createUser, getSettings } from "./db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.id || !account?.access_token) return false
      const existing = findUser(user.id)
      if (existing) return true
      const settings = getSettings()
      if (settings.allowRegistration) {
        createUser(user.id, user.name || "Unknown", user.image || null)
        return true
      }
      return false
    },
    async jwt({ token, account, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      if (user?.id) {
        const existing = findUser(user.id)
        if (existing) token.role = existing.role
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.role = token.role as string | undefined
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
  }
}
