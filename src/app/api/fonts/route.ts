import { getServerSession } from "@/lib/auth"
import {
  assertProjectOwned,
  collectLocalFonts,
  getProjectFontDirs,
  getUserId,
} from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { mkdtempSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  try {
    assertProjectOwned(userId, projectId)
    const tmpDir = mkdtempSync(join(tmpdir(), "typst-fonts-"))
    const fontDir = join(tmpDir, "fonts")
    mkdirSync(fontDir)

    const projectDirs = getProjectFontDirs(userId, projectId)
    const fontPaths = [...projectDirs]
    const copied = collectLocalFonts(userId, projectId, fontDir)
    if (copied > 0) fontPaths.push(fontDir)

    if (fontPaths.length === 0) {
      rmSync(tmpDir, { recursive: true, force: true })
      return NextResponse.json({ fonts: [], paths: [] })
    }

    const flags = fontPaths.map((p) => `--font-path "${p}"`).join(" ")
    const output = execSync(`typst fonts ${flags}`, {
      timeout: 10000,
      encoding: "utf-8",
    })

    const lines = output.trim().split("\n").filter(Boolean)
    const fonts = lines.map((line) => {
      const parts = line.split(/\s{2,}/)
      return {
        family: parts[0]?.trim() || line.trim(),
        styles: parts[1]?.trim() || "",
      }
    })

    rmSync(tmpDir, { recursive: true, force: true })
    return NextResponse.json({ fonts, paths: projectDirs, filesCopied: copied })
  } catch (error: any) {
    const message =
      error.stderr?.toString() || error.message || "Failed to list fonts"
    console.error("[fonts] Error listing fonts:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
