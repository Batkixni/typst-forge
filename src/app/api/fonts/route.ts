import { auth } from "@/lib/auth"
import { collectProjectFonts } from "@/lib/fonts"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { mkdtempSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

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
    await collectProjectFonts(fontDir, session.accessToken, owner || undefined, repo || undefined)

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
    console.error("[fonts] Error listing fonts:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
