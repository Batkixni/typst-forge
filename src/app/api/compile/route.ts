import { auth } from "@/lib/auth"
import { collectProjectFonts } from "@/lib/fonts"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { mkdtempSync, mkdirSync } from "fs"

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
    await collectProjectFonts(fontDir, session.accessToken, owner, repo)

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
