import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { writeFileSync, unlinkSync, mkdtempSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { Octokit } from "@octokit/rest"

const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm"])
const UPLOAD_DIR = join(process.cwd(), "data", "uploads")

async function collectFonts(fontDir: string, accessToken: string, owner?: string, repo?: string) {
  // From local pending uploads
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

  // From GitHub repo fonts/ directory
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
    } catch {
      // fonts/ dir doesn't exist on GitHub — ignore
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { content, owner, repo } = await req.json()

    if (!content) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      )
    }

    const tmpDir = mkdtempSync(join(tmpdir(), "typst-"))
    const sourcePath = join(tmpDir, "main.typ")
    const pdfPath = join(tmpDir, "main.pdf")

    writeFileSync(sourcePath, content, "utf-8")

    // Collect project fonts
    const fontDir = join(tmpDir, "fonts")
    mkdirSync(fontDir)
    await collectFonts(fontDir, session.accessToken, owner, repo)

    const fontFlag = `--font-path "${fontDir}"`

    execSync(`typst compile ${fontFlag} "${sourcePath}" "${pdfPath}"`, {
      timeout: 30000,
      stdio: "pipe",
    })

    const fs = await import("fs/promises")
    const pdfBuffer = await fs.readFile(pdfPath)

    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {}

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=output.pdf",
      },
    })
  } catch (error: any) {
    console.error("Compilation failed:", error)

    const message =
      error.stderr?.toString() ||
      error.message ||
      "Compilation failed. Ensure Typst CLI is installed."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
