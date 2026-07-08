import { getServerSession, getAccessToken } from "@/lib/auth"
import { collectProjectFonts } from "@/lib/fonts"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { mkdtempSync, mkdirSync } from "fs"
import { rm, readdir } from "fs/promises"

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!getAccessToken(session?.session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = getAccessToken(session!.session)!

  try {
    const { content, owner, repo, format = "pdf", filename } = await req.json()

    if (!content) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      )
    }

    const outputFormat = ["pdf", "png", "svg"].includes(format) ? format : "pdf"

    const tmpDir = mkdtempSync(join(tmpdir(), "typst-"))
    const sourcePath = join(tmpDir, "main.typ")
    const outputPath = join(tmpDir, `output.${outputFormat}`)

    writeFileSync(sourcePath, content, "utf-8")

    // Collect project fonts
    const fontDir = join(tmpDir, "fonts")
    mkdirSync(fontDir)
    await collectProjectFonts(fontDir, accessToken, owner, repo)

    const fontFlag = `--font-path "${fontDir}"`

    execSync(`typst compile ${fontFlag} "${sourcePath}" "${outputPath}"`, {
      timeout: 30000,
      stdio: "pipe",
    })

    const fs = await import("fs/promises")

    let buffer: Buffer
    let contentType: string
    let outputFilename: string

    if (outputFormat === "pdf") {
      buffer = await fs.readFile(outputPath)
      contentType = "application/pdf"
      outputFilename = filename || "output.pdf"
    } else if (outputFormat === "svg") {
      buffer = await fs.readFile(outputPath)
      contentType = "image/svg+xml"
      outputFilename = filename || "output.svg"
    } else {
      // PNG: typst may produce multiple pages. If multiple files, zip them; otherwise return the single PNG.
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
        pngFiles.forEach((f, i) => {
          zip.file(`page-${i + 1}.png`, fs.readFile(join(tmpDir, f)))
        })
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
