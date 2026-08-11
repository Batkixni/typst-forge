import { getServerSession } from "@/lib/auth"
import {
  assertProjectOwned,
  getUserId,
  listProjectFontFiles,
  prepareCompileFontPaths,
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

    const onDisk = listProjectFontFiles(userId, projectId)
    const tmpDir = mkdtempSync(join(tmpdir(), "typst-fonts-"))
    const fontDir = join(tmpDir, "fonts")
    mkdirSync(fontDir)

    const prepared = prepareCompileFontPaths(userId, projectId, fontDir)

    let fonts: { family: string; styles: string }[] = []
    if (prepared.fontPaths.length > 0) {
      try {
        const flags = prepared.fontPaths.map((p) => `--font-path "${p}"`).join(" ")
        const output = execSync(`typst fonts ${flags}`.replace(/\s+/g, " "), {
          timeout: 15000,
          encoding: "utf-8",
        })
        fonts = output
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const parts = line.split(/\s{2,}/)
            return {
              family: parts[0]?.trim() || line.trim(),
              styles: parts[1]?.trim() || "",
            }
          })
      } catch (err: any) {
        console.warn("[fonts] typst fonts failed:", err?.message || err)
      }
    }

    rmSync(tmpDir, { recursive: true, force: true })

    return NextResponse.json({
      fonts,
      files: onDisk.map((f) => ({
        path: f.path,
        size: f.size,
        isLfsPointer: f.isLfsPointer,
      })),
      staged: prepared.staged,
      lfsPointers: prepared.lfsPointers,
      paths: prepared.fontPaths,
    })
  } catch (error: any) {
    const message =
      error.stderr?.toString() || error.message || "Failed to list fonts"
    console.error("[fonts] Error listing fonts:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
