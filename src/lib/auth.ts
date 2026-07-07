import { betterAuth } from "better-auth"
import { kyselyAdapter } from "@better-auth/kysely-adapter"
import Database from "better-sqlite3"
import { Kysely, SqliteDialect } from "kysely"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"
import { headers } from "next/headers"
import { deduplicateUsers, ensureAdminExists, findOrCreateUser } from "./db"

const dataDir = join(process.cwd(), "data")
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const dbPath = join(dataDir, "better-auth.db")

const nativeDb = new Database(dbPath)
const kyselyDb = new Kysely<any>({
  dialect: new SqliteDialect({
    database: nativeDb,
  }),
})

function createTables() {
  try {
    const need: Record<string, string> = {
      user: "id text primary key, name text not null, email text not null unique, emailVerified integer not null default 0, image text, createdAt text not null, updatedAt text not null, role text not null default 'user', githubId text not null",
      session: "id text primary key, expiresAt text not null, token text not null unique, createdAt text not null, updatedAt text not null, ipAddress text, userAgent text, userId text not null references user(id) on delete cascade, accessToken text",
      account: "id text primary key, accountId text not null, providerId text not null, userId text not null references user(id) on delete cascade, accessToken text, refreshToken text, idToken text, accessTokenExpiresAt text, refreshTokenExpiresAt text, scope text, password text, createdAt text not null, updatedAt text not null",
      verification: "id text primary key, identifier text not null, value text not null, expiresAt text not null, createdAt text not null, updatedAt text not null",
    }
    for (const [name, cols] of Object.entries(need)) {
      nativeDb.exec(`CREATE TABLE IF NOT EXISTS ${name} (${cols})`)
    }
  } catch (error) {
    console.warn("[BetterAuth] Failed to create tables at module load, will retry on first request:", error)
  }
}

createTables()

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  database: kyselyAdapter(kyselyDb),
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      scope: ["read:user", "user:email", "repo"],
      mapProfileToUser: (profile: any) => ({
        id: String(profile.id),
        githubId: String(profile.id),
      } as any),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
      },
      githubId: {
        type: "string",
        required: true,
      },
    },
  },
  session: {
    additionalFields: {
      accessToken: {
        type: "string",
        required: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, context) => {
          if (context) {
            const accounts = await context.context.adapter.findMany({
              model: "account",
              where: [
                { field: "userId", operator: "eq", value: session.userId },
                { field: "providerId", operator: "eq", value: "github" },
              ],
            })
            if (accounts && accounts.length > 0) {
              const account = accounts[0] as Record<string, unknown>
              if (account.accessToken) {
                return {
                  data: {
                    ...session,
                    accessToken: account.accessToken as string,
                  },
                }
              }
            }
          }
        },
      },
    },
    user: {
      create: {
        before: async (user, context) => {
          if (context) {
            const existing = await context.context.adapter.findMany({
              model: "user",
              where: [],
            })
            if (!existing || existing.length === 0) {
              return {
                data: {
                  ...user,
                  role: "admin",
                },
              }
            }
          }
        },
        after: async (user, _ctx) => {
          deduplicateUsers()
          const ghId = (user as Record<string, unknown>).githubId as string
          findOrCreateUser(ghId, user.name || "Unknown", user.image || null)
          ensureAdminExists()
        },
      },
    },
  },
})

export async function getServerSession() {
  const h = await headers()
  return auth.api.getSession({
    headers: h,
  })
}

export function getRole(user: { role?: string } | null | undefined): string {
  return user?.role ?? "user"
}

export function getAccessToken(session: { accessToken?: string | null } | null | undefined): string | null | undefined {
  return session?.accessToken
}

