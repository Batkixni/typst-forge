import { Octokit } from "@octokit/rest"
import { readdirSync, copyFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm"])
const UPLOAD_DIR = join(process.cwd(), "data", "uploads")

async function findFontsDir(octokit: Octokit, owner: string, repo: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: "" })
    if (!Array.isArray(data)) return null
    for (const item of data) {
      if (item.type === "dir" && item.name.toLowerCase() === "fonts") {
        console.log(`[fonts] Found fonts directory: ${item.name}`)
        return item.name
      }
    }
  } catch (err) {
    console.error("[fonts] Failed to list repo root:", err)
  }
  return null
}

export async function collectProjectFonts(
  fontDir: string,
  accessToken: string,
  owner?: string,
  repo?: string
): Promise<void> {
  if (!existsSync(fontDir)) mkdirSync(fontDir, { recursive: true })

  // From local pending uploads
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
            console.log(`[fonts] Copied local upload: ${entry.name}`)
          }
        }
      } catch (err) {
        console.error("[fonts] Failed to read local uploads:", err)
      }
    }
  }

  // From GitHub repo
  if (accessToken && owner && repo) {
    const octokit = new Octokit({ auth: accessToken })
    const fontsDirName = await findFontsDir(octokit, owner, repo)
    if (!fontsDirName) {
      console.log("[fonts] No fonts/ directory found in repo root")
      return
    }

    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: fontsDirName })
      if (!Array.isArray(data)) {
        console.warn(`[fonts] '${fontsDirName}' is not a directory`)
        return
      }
      let count = 0
      for (const item of data) {
        if (item.type !== "file") continue
        const ext = item.name.split(".").pop()?.toLowerCase() || ""
        if (!FONT_EXTS.has(ext)) continue
        try {
          const bytes = await downloadFile(octokit, accessToken, owner, repo, item)
          writeFileSync(join(fontDir, item.name), bytes)
          count++
          console.log(`[fonts] Downloaded: ${item.name} (${(bytes.length / 1024).toFixed(1)} KB)`)
        } catch (err) {
          console.error(`[fonts] Failed to download ${item.name}:`, err)
        }
      }
      console.log(`[fonts] Total: ${count} font(s) loaded from GitHub`)
    } catch (err) {
      console.error(`[fonts] Failed to read '${fontsDirName}' directory:`, err)
    }
  }
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
    console.warn(`[fonts] Contents API returned no content for ${item.name}, trying Blob API`)
  } catch (err: any) {
    console.warn(`[fonts] Contents API failed for ${item.name}: ${err.message}`)
  }

  // Strategy 2: via Blob API (works up to 100MB)
  try {
    const { data: blob, headers, status } = await octokit.rest.git.getBlob({ owner, repo, file_sha: item.sha })
    if (blob?.content) {
      return Buffer.from(blob.content, "base64")
    }
    console.error(`[fonts] Blob API returned no content for ${item.name}. Status: ${status}, Keys: ${Object.keys(blob).join(",")}`)
  } catch (err: any) {
    console.error(`[fonts] Blob API failed for ${item.name}: ${err.message}`)
  }

  // Strategy 3: raw download_url
  if (item.download_url) {
    try {
      const resp = await fetch(item.download_url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (resp.ok) {
        return Buffer.from(await resp.arrayBuffer())
      }
      console.warn(`[fonts] Download URL failed for ${item.name}: ${resp.status}`)
    } catch (err: any) {
      console.warn(`[fonts] Download URL error for ${item.name}: ${err.message}`)
    }
  }

  throw new Error(`All download strategies failed for ${item.name}`)
}
