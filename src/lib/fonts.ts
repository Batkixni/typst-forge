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
          const { data: blob } = await octokit.git.getBlob({ owner, repo, file_sha: item.sha })
          const buf = Buffer.from(blob.content, "base64")
          writeFileSync(join(fontDir, item.name), buf)
          count++
          console.log(`[fonts] Downloaded: ${item.name} (${(buf.length / 1024).toFixed(1)} KB)`)
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
