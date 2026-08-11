import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
  renameSync,
  copyFileSync,
} from "fs"
import { join, relative, dirname, basename, sep } from "path"
import { randomUUID } from "crypto"
import type { ProjectFile } from "@/types"

const DATA_DIR = join(process.cwd(), "data")
const PROJECTS_DIR = join(DATA_DIR, "projects")

export interface GitBinding {
  owner: string
  repo: string
  branch: string
  htmlUrl?: string
}

export interface ProjectMeta {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  /** Relative entry file for compile, default main.typ */
  entry?: string
  git?: GitBinding | null
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function projectsRoot(): string {
  ensureDir(PROJECTS_DIR)
  return PROJECTS_DIR
}

export function userProjectsDir(userId: string): string {
  const dir = join(PROJECTS_DIR, sanitizeId(userId))
  ensureDir(dir)
  return dir
}

export function projectDir(userId: string, projectId: string): string {
  return join(userProjectsDir(userId), sanitizeId(projectId))
}

export function metaPath(userId: string, projectId: string): string {
  return join(projectDir(userId, projectId), ".forge", "meta.json")
}

/** Reject path traversal; returns posix-style relative path */
export function safeRelPath(p: string): string {
  const cleaned = p.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!cleaned || cleaned.includes("..") || cleaned.startsWith(".forge")) {
    throw new Error("Invalid path")
  }
  return cleaned
}

function sanitizeId(id: string): string {
  if (!id || /[^a-zA-Z0-9._-]/.test(id) || id.includes("..")) {
    throw new Error("Invalid id")
  }
  return id
}

export function readMeta(userId: string, projectId: string): ProjectMeta | null {
  const p = metaPath(userId, projectId)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as ProjectMeta
  } catch {
    return null
  }
}

export function writeMeta(userId: string, projectId: string, meta: ProjectMeta): void {
  const dir = join(projectDir(userId, projectId), ".forge")
  ensureDir(dir)
  writeFileSync(metaPath(userId, projectId), JSON.stringify(meta, null, 2), "utf-8")
}

export function touchMeta(userId: string, projectId: string): ProjectMeta | null {
  const meta = readMeta(userId, projectId)
  if (!meta) return null
  meta.updatedAt = new Date().toISOString()
  writeMeta(userId, projectId, meta)
  return meta
}

export function listProjects(userId: string): ProjectMeta[] {
  const root = userProjectsDir(userId)
  if (!existsSync(root)) return []
  const result: ProjectMeta[] = []
  for (const name of readdirSync(root)) {
    const meta = readMeta(userId, name)
    if (meta) result.push(meta)
  }
  result.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
  return result
}

export function createProject(
  userId: string,
  opts: { name: string; description?: string; entryContent?: string }
): ProjectMeta {
  const id = randomUUID()
  const root = projectDir(userId, id)
  ensureDir(root)
  ensureDir(join(root, ".forge"))
  ensureDir(join(root, "fonts"))

  const now = new Date().toISOString()
  const meta: ProjectMeta = {
    id,
    name: opts.name.trim() || "Untitled",
    description: opts.description?.trim() || "",
    createdAt: now,
    updatedAt: now,
    entry: "main.typ",
    git: null,
  }
  writeMeta(userId, id, meta)

  const main = opts.entryContent ?? `= ${meta.name}\n\nWrite your Typst document here.\n`
  writeFileSync(join(root, "main.typ"), main, "utf-8")
  return meta
}

export function deleteProject(userId: string, projectId: string): boolean {
  const root = projectDir(userId, projectId)
  if (!existsSync(root)) return false
  rmSync(root, { recursive: true, force: true })
  return true
}

export function resolveProjectFile(userId: string, projectId: string, relPath: string): string {
  const safe = safeRelPath(relPath)
  const root = projectDir(userId, projectId)
  const full = join(root, ...safe.split("/"))
  const resolved = full
  // Ensure still under project root
  const rel = relative(root, resolved)
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw new Error("Path escapes project root")
  }
  return resolved
}

function buildTree(dir: string, base: string): ProjectFile[] {
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir, { withFileTypes: true })
  const nodes: ProjectFile[] = []

  for (const entry of entries) {
    if (entry.name === ".forge" || entry.name.startsWith(".")) continue
    const full = join(dir, entry.name)
    const rel = relative(base, full).replace(/\\/g, "/")
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: rel,
        type: "dir",
        children: buildTree(full, base),
      })
    } else if (entry.isFile()) {
      const st = statSync(full)
      nodes.push({
        name: entry.name,
        path: rel,
        type: "file",
        size: st.size,
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return nodes
}

export function getProjectTree(userId: string, projectId: string): ProjectFile[] {
  const root = projectDir(userId, projectId)
  if (!existsSync(root)) throw new Error("Project not found")
  return buildTree(root, root)
}

export function readTextFile(userId: string, projectId: string, relPath: string): string {
  const full = resolveProjectFile(userId, projectId, relPath)
  if (!existsSync(full) || !statSync(full).isFile()) throw new Error("File not found")
  return readFileSync(full, "utf-8")
}

export function readBinaryFile(userId: string, projectId: string, relPath: string): Buffer {
  const full = resolveProjectFile(userId, projectId, relPath)
  if (!existsSync(full) || !statSync(full).isFile()) throw new Error("File not found")
  return readFileSync(full)
}

export function writeTextFile(
  userId: string,
  projectId: string,
  relPath: string,
  content: string
): void {
  const full = resolveProjectFile(userId, projectId, relPath)
  ensureDir(dirname(full))
  writeFileSync(full, content, "utf-8")
  touchMeta(userId, projectId)
}

export function writeBinaryFile(
  userId: string,
  projectId: string,
  relPath: string,
  data: Buffer
): void {
  const full = resolveProjectFile(userId, projectId, relPath)
  ensureDir(dirname(full))
  writeFileSync(full, data)
  touchMeta(userId, projectId)
}

export function createEmptyFile(
  userId: string,
  projectId: string,
  relPath: string,
  isDir: boolean
): void {
  if (isDir) {
    const full = resolveProjectFile(userId, projectId, relPath)
    ensureDir(full)
  } else {
    writeTextFile(userId, projectId, relPath, "")
  }
  touchMeta(userId, projectId)
}

export function deleteProjectPath(userId: string, projectId: string, relPath: string): void {
  const full = resolveProjectFile(userId, projectId, relPath)
  if (!existsSync(full)) throw new Error("Not found")
  rmSync(full, { recursive: true, force: true })
  touchMeta(userId, projectId)
}

export function renameProjectPath(
  userId: string,
  projectId: string,
  oldPath: string,
  newPath: string
): void {
  const from = resolveProjectFile(userId, projectId, oldPath)
  const to = resolveProjectFile(userId, projectId, newPath)
  if (!existsSync(from)) throw new Error("Source not found")
  if (existsSync(to)) throw new Error("Destination already exists")
  ensureDir(dirname(to))
  renameSync(from, to)
  touchMeta(userId, projectId)
}

/** Flatten all files under project (relative posix paths) */
export function listAllFiles(userId: string, projectId: string): string[] {
  const root = projectDir(userId, projectId)
  const out: string[] = []

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".forge" || entry.name.startsWith(".")) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) {
        out.push(relative(root, full).replace(/\\/g, "/"))
      }
    }
  }
  walk(root)
  return out
}

export const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm", "ttc", "otc"])

export interface DiscoveredFontFile {
  /** posix path relative to project root */
  path: string
  absPath: string
  size: number
  /** true if file looks like a Git LFS pointer instead of real font bytes */
  isLfsPointer: boolean
}

export function isGitLfsPointer(buf: Buffer): boolean {
  if (buf.length > 500 || buf.length < 20) return false
  const head = buf.subarray(0, 80).toString("utf-8")
  return head.startsWith("version https://git-lfs.github.com/spec/")
}

function isFontFilename(name: string): boolean {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  return FONT_EXTS.has(ext)
}

/** Walk whole project tree and list every font file (skips .forge). */
export function listProjectFontFiles(
  userId: string,
  projectId: string
): DiscoveredFontFile[] {
  const root = projectDir(userId, projectId)
  if (!existsSync(root)) return []
  const out: DiscoveredFontFile[] = []

  function walk(dir: string) {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === ".forge" || entry.name === ".git") continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && isFontFilename(entry.name)) {
        let size = 0
        let isLfsPointer = false
        try {
          size = statSync(full).size
          // LFS pointers are tiny text files
          if (size > 0 && size < 500) {
            const buf = readFileSync(full)
            isLfsPointer = isGitLfsPointer(buf)
          }
        } catch {
          /* ignore */
        }
        out.push({
          path: relative(root, full).replace(/\\/g, "/"),
          absPath: full,
          size,
          isLfsPointer,
        })
      }
    }
  }
  walk(root)
  return out
}

/** Case-insensitive fonts directory candidates under project root. */
export function getProjectFontDirs(userId: string, projectId: string): string[] {
  const root = projectDir(userId, projectId)
  if (!existsSync(root)) return []
  const dirs: string[] = []
  const seen = new Set<string>()

  function add(dir: string) {
    const key = dir.toLowerCase()
    if (!seen.has(key) && existsSync(dir) && statSync(dir).isDirectory()) {
      seen.add(key)
      dirs.push(dir)
    }
  }

  add(join(root, "fonts"))
  add(join(root, "Fonts"))
  add(join(root, "font"))
  add(join(root, "assets", "fonts"))
  add(join(root, "static", "fonts"))

  // any top-level dir named fonts/font (case variants already covered)
  try {
    for (const name of readdirSync(root, { withFileTypes: true })) {
      if (!name.isDirectory()) continue
      const lower = name.name.toLowerCase()
      if (lower === "fonts" || lower === "font") add(join(root, name.name))
    }
  } catch {
    /* ignore */
  }

  return dirs
}

/**
 * Prepare font paths for `typst compile --font-path`.
 * - Always include project root (recursive) so fonts/ anywhere is found
 * - Always include dedicated fonts dirs
 * - Stage real font files into destDir (skip LFS pointers)
 */
export function prepareCompileFontPaths(
  userId: string,
  projectId: string,
  stagingDir: string
): {
  fontPaths: string[]
  files: DiscoveredFontFile[]
  staged: number
  lfsPointers: string[]
} {
  ensureDir(stagingDir)
  const root = projectDir(userId, projectId)
  const files = listProjectFontFiles(userId, projectId)
  const lfsPointers = files.filter((f) => f.isLfsPointer).map((f) => f.path)
  const real = files.filter((f) => !f.isLfsPointer && f.size > 0)

  let staged = 0
  for (const f of real) {
    try {
      // unique flat name: fonts_NotoSans-Regular.ttf
      const flat = f.path.replace(/[\\/]/g, "_")
      copyFileSync(f.absPath, join(stagingDir, flat))
      staged++
    } catch (err) {
      console.warn("[fonts] failed to stage", f.path, err)
    }
  }

  const fontPaths: string[] = []
  // Project root — Typst recursively searches (picks up fonts/, nested dirs)
  if (existsSync(root)) fontPaths.push(root)
  for (const d of getProjectFontDirs(userId, projectId)) {
    if (!fontPaths.includes(d)) fontPaths.push(d)
  }
  if (staged > 0) fontPaths.push(stagingDir)

  return { fontPaths, files, staged, lfsPointers }
}

/** @deprecated use prepareCompileFontPaths — kept for fonts API */
export function collectLocalFonts(
  userId: string,
  projectId: string,
  destDir: string
): number {
  return prepareCompileFontPaths(userId, projectId, destDir).staged
}

export function assertProjectOwned(userId: string, projectId: string): ProjectMeta {
  const meta = readMeta(userId, projectId)
  if (!meta) throw new Error("Project not found")
  return meta
}

export function getUserId(session: { user?: { id?: string } } | null): string | null {
  return session?.user?.id ?? null
}
