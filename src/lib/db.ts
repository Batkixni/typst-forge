import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

export type UserRole = "admin" | "user"

export interface User {
  githubId: string
  name: string
  avatar: string | null
  role: UserRole
  createdAt: string
}

export interface Settings {
  allowRegistration: boolean
}

interface DbData {
  users: User[]
  settings: Settings
}

function dbPath(): string {
  const dir = join(process.cwd(), "data")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, "db.json")
}

function readDb(): DbData {
  const path = dbPath()
  if (!existsSync(path)) {
    const initial: DbData = { users: [], settings: { allowRegistration: false } }
    writeFileSync(path, JSON.stringify(initial, null, 2), "utf-8")
    return initial
  }
  return JSON.parse(readFileSync(path, "utf-8"))
}

function writeDb(data: DbData): void {
  writeFileSync(dbPath(), JSON.stringify(data, null, 2), "utf-8")
}

export function findUser(githubId: string): User | null {
  const db = readDb()
  return db.users.find((u) => u.githubId === githubId) ?? null
}

export function findOrCreateUser(githubId: string, name: string, avatar: string | null): User {
  const db = readDb()
  const existing = db.users.find((u) => u.githubId === githubId)
  if (existing) return existing
  const isFirst = db.users.length === 0
  const user: User = {
    githubId,
    name,
    avatar,
    role: isFirst ? "admin" : "user",
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  writeDb(db)
  return user
}

// remove duplicates in case race condition created any
export function deduplicateUsers(): void {
  const db = readDb()
  const seen = new Set<string>()
  const deduped: User[] = []
  for (const u of db.users) {
    if (!seen.has(u.githubId)) {
      seen.add(u.githubId)
      deduped.push(u)
    }
  }
  if (deduped.length !== db.users.length) {
    db.users = deduped
    writeDb(db)
  }
}

export function getSettings(): Settings {
  return readDb().settings
}

export function setSettings(s: Partial<Settings>): Settings {
  const db = readDb()
  db.settings = { ...db.settings, ...s }
  writeDb(db)
  return db.settings
}

export function listUsers(): User[] {
  return readDb().users
}

export function getUserCount(): number {
  return readDb().users.length
}

export function ensureAdminExists(): void {
  const db = readDb()
  const hasAdmin = db.users.some((u) => u.role === "admin")
  if (!hasAdmin && db.users.length > 0) {
    db.users[0].role = "admin"
    writeDb(db)
  }
}
