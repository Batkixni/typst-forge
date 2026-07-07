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

export function createUser(githubId: string, name: string, avatar: string | null): User {
  const db = readDb()
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
