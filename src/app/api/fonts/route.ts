import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { Octokit } from "@octokit/rest"

const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm"])
const UPLOAD_DIR = join(process.cwd(), "data", "uploads")

async function collectFonts(fontDir: string, accessToken: string, owner?: string, repo?: string) {
  if (owner && repo) {
    const localFonts = join(UPLOAD_DIR, owner, repo, "fonts")
    if (existsSync(localFonts)) {
      const entries = readdirSync(localFonts, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const ext = entry.name.split(".").pop()?.toLowerCase() || ""
        if (FONT_EXTS.has(ext)) {
          copyFileSync(join(localFonts, entry.name), join(fontDir, entry.name))
        }
      }
    }
  }

  if (accessToken && owner && repo) {
    try {
      const octokit = new Octokit({ auth: accessToken })
      const { data } = await octokit.repos.getContent({ owner, repo, path: "fonts" })
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type !== "file") continue
          const ext = item.name.split(".").pop()?.toLowerCase() || ""
          if (!FONT_EXTS.has(ext)) continue
          const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: item.path })
          if (!Array.isArray(fileData) && "content" in fileData && fileData.content) {
            const buf = Buffer.from(fileData.content.replace(/\n/g, ""), "base64")
            writeFileSync(join(fontDir, item.name), buf)
          }
        }
      }
    } catch {}
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")

  try {
    const tmpDir = mkdtempSync(join(tmpdir(), "typst-fonts-"))
    const fontDir = join(tmpDir, "fonts")
    mkdirSync(fontDir)
    await collectFonts(fontDir, session.accessToken, owner || undefined, repo || undefined)

    const output = execSync(`typst fonts --font-path "${fontDir}"`, {
      timeout: 10000,
      encoding: "utf-8",
    })

    const lines = output.trim().split("\n").filter(Boolean)
    const fonts = lines.map((line) => {
      const parts = line.split(/\s{2,}/)
      return { family: parts[0]?.trim() || line.trim(), styles: parts[1]?.trim() || "" }
    })

    const { rmSync } = await import("fs")
    rmSync(tmpDir, { recursive: true, force: true })

    return NextResponse.json({ fonts })
  } catch (error: any) {
    const message = error.stderr?.toString() || error.message || "Failed to list fonts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
