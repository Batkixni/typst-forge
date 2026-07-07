import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { findOrCreateUser, findUser } from "./db"

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
          findOrCreateUser(user.id, user.name || "Unknown", user.image || null)
        }
      } catch {}
      return true
    },
    async jwt({ token, account, user }) {
      try {
        if (account?.access_token) token.accessToken = account.access_token
        if (user?.id) {
          const existing = findUser(user.id)
          if (existing) token.role = existing.role
        }
      } catch {}
      return token
    },
    async session({ session, token }) {
      try {
        session.accessToken = token.accessToken as string
        session.user.role = token.role as string | undefined
      } catch {}
      return session
    },
  },
  pages: { signIn: "/", error: "/?error=AccessDenied" },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string
    user: { role?: string; name?: string | null; email?: string | null; image?: string | null }
  }
}
declare module "@auth/core/jwt" {
  interface JWT { accessToken?: string; role?: string }
}
