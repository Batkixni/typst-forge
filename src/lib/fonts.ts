import { Octokit } from "@octokit/rest"
import { readdirSync, copyFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm"])
const UPLOAD_DIR = join(process.cwd(), "data", "uploads")

export async function collectProjectFonts(
  fontDir: string,
  accessToken: string,
  owner?: string,
  repo?: string
): Promise<void> {
  if (!existsSync(fontDir)) mkdirSync(fontDir, { recursive: true })

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

  if (accessToken && owner && repo) {
    try {
      const octokit = new Octokit({ auth: accessToken })
      const { data } = await octokit.repos.getContent({ owner, repo, path: "fonts" })
      if (!Array.isArray(data)) {
        console.warn("[fonts] 'fonts' path exists but is not a directory")
        return
      }
      for (const item of data) {
        if (item.type !== "file") continue
        const ext = item.name.split(".").pop()?.toLowerCase() || ""
        if (!FONT_EXTS.has(ext)) continue
        try {
          const { data: blob } = await octokit.git.getBlob({ owner, repo, file_sha: item.sha })
          const buf = Buffer.from(blob.content, "base64")
          writeFileSync(join(fontDir, item.name), buf)
          console.log(`[fonts] Downloaded from GitHub: ${item.name} (${(buf.length / 1024).toFixed(1)} KB)`)
        } catch (err) {
          console.error(`[fonts] Failed to download ${item.name}:`, err)
        }
      }
    } catch (err) {
      console.log("[fonts] No fonts/ directory on GitHub")
    }
  }
}
