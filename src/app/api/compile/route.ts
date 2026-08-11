import { getServerSession } from "@/lib/auth"
import {
  assertProjectOwned,
  getUserId,
  prepareCompileFontPaths,
  projectDir,
} from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { existsSync, mkdirSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { readdir } from "fs/promises"

/**
 * Compile from local project directory so multi-file #import works.
 * Fonts: project root + fonts/ + staged copies via --font-path (recursive).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      projectId,
      entry,
      format = "pdf",
      filename,
      content,
      path: contentPath,
    } = body

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 })
    }

    const meta = assertProjectOwned(userId, projectId)
    const root = projectDir(userId, projectId)

    // Flush editor buffer to disk before compile so preview matches editor
    if (typeof content === "string" && contentPath) {
      const { writeTextFile } = await import("@/lib/projects")
      writeTextFile(userId, projectId, contentPath, content)
    }

    const entryFile = entry || meta.entry || "main.typ"
    const entryAbs = join(root, ...entryFile.replace(/\\/g, "/").split("/"))
    if (!existsSync(entryAbs)) {
      return NextResponse.json(
        { error: `Entry file not found: ${entryFile}` },
        { status: 400 }
      )
    }

    const isPreview = format === "preview"
    const outputFormat = isPreview
      ? "svg"
      : ["pdf", "png", "svg"].includes(format)
        ? format
        : "pdf"

    const tmpDir = mkdtempSync(join(tmpdir(), "typst-"))
    const outputPath = isPreview
      ? join(tmpDir, "page-{n}.svg")
      : join(tmpDir, `output.${outputFormat}`)

    // Stage + collect every font path under the project
    const stagingFonts = join(tmpDir, "fonts")
    mkdirSync(stagingFonts, { recursive: true })
    const fontInfo = prepareCompileFontPaths(userId, projectId, stagingFonts)

    const fontFlag = fontInfo.fontPaths
      .map((p) => `--font-path "${p}"`)
      .join(" ")
    const rootFlag = `--root "${root}"`

    // Discover families Typst actually sees (helps debug CJK tofu)
    let families: string[] = []
    try {
      const listed = execSync(`typst fonts ${fontFlag}`.replace(/\s+/g, " "), {
        timeout: 15000,
        encoding: "utf-8",
      })
      families = listed
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split(/\s{2,}/)[0]?.trim() || line.trim())
    } catch (err) {
      console.warn("[compile] typst fonts listing failed:", err)
    }

    try {
      execSync(
        `typst compile ${rootFlag} ${fontFlag} "${entryAbs}" "${outputPath}"`.replace(
          /\s+/g,
          " "
        ),
        { timeout: 30000, stdio: "pipe" }
      )
    } catch (error: any) {
      try {
        const { rmSync } = await import("fs")
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
      const message =
        error.stderr?.toString() ||
        error.message ||
        "Compilation failed. Ensure Typst CLI is installed."
      return NextResponse.json(
        {
          error: message,
          fontDebug: {
            staged: fontInfo.staged,
            files: fontInfo.files.map((f) => ({
              path: f.path,
              size: f.size,
              isLfsPointer: f.isLfsPointer,
            })),
            lfsPointers: fontInfo.lfsPointers,
            families,
          },
        },
        { status: 500 }
      )
    }

    const fs = await import("fs/promises")

    const fontDebug = {
      staged: fontInfo.staged,
      fileCount: fontInfo.files.length,
      files: fontInfo.files.map((f) => ({
        path: f.path,
        size: f.size,
        isLfsPointer: f.isLfsPointer,
      })),
      lfsPointers: fontInfo.lfsPointers,
      families: families.slice(0, 200),
      paths: fontInfo.fontPaths,
    }

    if (isPreview) {
      const files = await readdir(tmpDir)
      const svgFiles = files
        .filter((f) => /^page-\d+\.svg$/.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] || "0", 10)
          const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10)
          return na - nb
        })
      const list = svgFiles.length
        ? svgFiles
        : files.filter((f) => f.endsWith(".svg")).sort()
      if (list.length === 0) {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true })
        } catch {}
        return NextResponse.json({ error: "SVG preview failed", fontDebug }, { status: 500 })
      }
      const pages = await Promise.all(
        list.map((f) => fs.readFile(join(tmpDir, f), "utf-8"))
      )
      try {
        await fs.rm(tmpDir, { recursive: true, force: true })
      } catch {}
      return NextResponse.json({ pages, fontDebug })
    }

    let buffer: Buffer
    let contentType: string
    let outputFilename: string

    if (outputFormat === "pdf") {
      buffer = await fs.readFile(outputPath)
      contentType = "application/pdf"
      outputFilename = filename || "output.pdf"
    } else if (outputFormat === "svg") {
      const files = await readdir(tmpDir)
      const svgFiles = files.filter((f) => f.endsWith(".svg")).sort()
      if (svgFiles.length === 0) {
        return NextResponse.json({ error: "SVG export failed" }, { status: 500 })
      }
      if (svgFiles.length === 1) {
        buffer = await fs.readFile(join(tmpDir, svgFiles[0]))
        contentType = "image/svg+xml"
        outputFilename = filename || "output.svg"
      } else {
        const { default: JSZip } = await import("jszip")
        const zip = new JSZip()
        for (let i = 0; i < svgFiles.length; i++) {
          zip.file(
            `page-${i + 1}.svg`,
            await fs.readFile(join(tmpDir, svgFiles[i]))
          )
        }
        buffer = await zip.generateAsync({ type: "nodebuffer" })
        contentType = "application/zip"
        outputFilename = filename || "output.zip"
      }
    } else {
      const files = await readdir(tmpDir)
      const pngFiles = files.filter((f) => f.endsWith(".png")).sort()
      if (pngFiles.length === 0) {
        return NextResponse.json({ error: "PNG export failed" }, { status: 500 })
      }
      if (pngFiles.length === 1) {
        buffer = await fs.readFile(join(tmpDir, pngFiles[0]))
        contentType = "image/png"
        outputFilename = filename || "output.png"
      } else {
        const { default: JSZip } = await import("jszip")
        const zip = new JSZip()
        for (let i = 0; i < pngFiles.length; i++) {
          zip.file(
            `page-${i + 1}.png`,
            await fs.readFile(join(tmpDir, pngFiles[i]))
          )
        }
        buffer = await zip.generateAsync({ type: "nodebuffer" })
        contentType = "application/zip"
        outputFilename = filename || "output.zip"
      }
    }

    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {}

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "X-Typst-Fonts-Staged": String(fontInfo.staged),
      },
    })
  } catch (error: any) {
    console.error("Compilation failed:", error)
    return NextResponse.json(
      {
        error:
          error.message ||
          "Compilation failed. Ensure Typst CLI is installed.",
      },
      { status: 500 }
    )
  }
}
