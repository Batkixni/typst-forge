import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { writeFileSync, unlinkSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { content } = await req.json()

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

    execSync(`typst compile "${sourcePath}" "${pdfPath}"`, {
      timeout: 30000,
      stdio: "pipe",
    })

    const fs = await import("fs/promises")
    const pdfBuffer = await fs.readFile(pdfPath)

    try {
      unlinkSync(sourcePath)
      unlinkSync(pdfPath)
      fs.rmdir(tmpDir).catch(() => {})
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
