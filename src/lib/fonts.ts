import { Octokit } from "@octokit/rest"
import { readdirSync, copyFileSync, writeFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import { join } from "path"

const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm"])
const UPLOAD_DIR = join(process.cwd(), "data", "uploads")
const CACHE_DIR = join(process.cwd(), "data", "fonts-cache")

async function findFontsDir(octokit: Octokit, owner: string, repo: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: "" })
    if (!Array.isArray(data)) return null
    for (const item of data) {
      if (item.type === "dir" && item.name.toLowerCase() === "fonts") {
        return item.name
      }
    }
  } catch (err) {
    console.error("[fonts] Failed to list repo root:", err)
  }
  return null
}

async function downloadFile(
  octokit: Octokit,
  accessToken: string,
  owner: string,
  repo: string,
  item: { name: string; path: string; sha: string; download_url: string | null }
): Promise<Buffer> {
  // Strategy 1: via Contents API (works for files < 1MB)
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: item.path })
    if (!Array.isArray(data) && "content" in data && data.content) {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64")
    }
  } catch {}

  // Strategy 2: via Blob API (works up to 100MB)
  try {
    const { data: blob } = await octokit.rest.git.getBlob({ owner, repo, file_sha: item.sha })
    if (blob?.content) {
      return Buffer.from(blob.content, "base64")
    }
  } catch {}

  // Strategy 3: raw download_url
  if (item.download_url) {
    try {
      const resp = await fetch(item.download_url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (resp.ok) return Buffer.from(await resp.arrayBuffer())
    } catch {}
  }

  throw new Error(`All download strategies failed for ${item.name}`)
}

function cachePath(owner: string, repo: string): string {
  const dir = join(CACHE_DIR, owner, repo)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export async function collectProjectFonts(
  fontDir: string,
  accessToken: string,
  owner?: string,
  repo?: string
): Promise<void> {
  if (!existsSync(fontDir)) mkdirSync(fontDir, { recursive: true })

  // 1. Local pending uploads
  if (owner && repo) {
    const localFonts = join(UPLOAD_DIR, owner, repo, "fonts")
    if (existsSync(localFonts)) {
      try {
        const entries = readdirSync(localFonts, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isFile()) continue
          const ext = entry.name.split(".").pop()?.toLowerCase() || ""
          if (FONT_EXTS.has(ext)) {
            copyFileSync(join(localFonts, entry.name), join(fontDir, entry.name))
          }
        }
      } catch (err) {
        console.error("[fonts] Failed to read local uploads:", err)
      }
    }
  }

  // 2. Cached / downloaded from GitHub
  if (accessToken && owner && repo) {
    const octokit = new Octokit({ auth: accessToken })
    const fontsDirName = await findFontsDir(octokit, owner, repo)
    if (!fontsDirName) return

    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: fontsDirName })
      if (!Array.isArray(data)) return

      const cache = cachePath(owner, repo)
      const shaFile = join(cache, ".shas.json")
      const prevShas: Record<string, string> = existsSync(shaFile)
        ? JSON.parse(readFileSync(shaFile, "utf-8"))
        : {}

      const newShas: Record<string, string> = {}
      let downloaded = 0

      for (const item of data) {
        if (item.type !== "file") continue
        const ext = item.name.split(".").pop()?.toLowerCase() || ""
        if (!FONT_EXTS.has(ext)) continue

        newShas[item.name] = item.sha
        const cachedFile = join(cache, item.name)

        if (existsSync(cachedFile) && prevShas[item.name] === item.sha) {
          // Cache hit — just copy
          copyFileSync(cachedFile, join(fontDir, item.name))
        } else {
          // Cache miss — download and cache
          try {
            const buf = await downloadFile(octokit, accessToken, owner, repo, item)
            writeFileSync(join(fontDir, item.name), buf)
            writeFileSync(cachedFile, buf)
            downloaded++
          } catch (err) {
            console.error(`[fonts] Failed to download ${item.name}:`, err)
          }
        }
      }

      writeFileSync(shaFile, JSON.stringify(newShas, null, 2))
      if (downloaded > 0) console.log(`[fonts] Downloaded ${downloaded} new/cached font(s)`)
    } catch (err) {
      console.error("[fonts] Failed to read fonts directory:", err)
    }
  }
}
