import { getServerSession } from "@/lib/auth"
import {
  assertProjectOwned,
  createEmptyFile,
  getProjectTree,
  getUserId,
  readBinaryFile,
  readTextFile,
  writeBinaryFile,
  writeTextFile,
} from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"

const TEXT_EXT = new Set([
  "typ", "txt", "md", "json", "toml", "yaml", "yml", "css", "html", "js", "ts",
  "tsx", "jsx", "svg", "bib", "csv", "xml", "gitignore", "typst",
])

function isTextPath(path: string): boolean {
  const base = path.split("/").pop() || path
  if (base.startsWith(".") && !base.includes(".", 1)) return true
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : ""
  return !ext || TEXT_EXT.has(ext)
}

/** GET ?projectId=&path=  → tree (no path) or file content */
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const path = searchParams.get("path")
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  try {
    assertProjectOwned(userId, projectId)

    if (!path) {
      const tree = getProjectTree(userId, projectId)
      return NextResponse.json({ files: tree })
    }

    if (isTextPath(path)) {
      const content = readTextFile(userId, projectId, path)
      return NextResponse.json({ path, content, encoding: "utf-8" })
    }

    const buf = readBinaryFile(userId, projectId, path)
    const ext = path.split(".").pop()?.toLowerCase() || ""
    const mime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      pdf: "application/pdf",
      ttf: "font/ttf",
      otf: "font/otf",
      woff: "font/woff",
      woff2: "font/woff2",
    }
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${path.split("/").pop()}"`,
      },
    })
  } catch (error: any) {
    console.error("GET files failed:", error)
    return NextResponse.json(
      { error: error.message || "Failed to read" },
      { status: error.message === "Project not found" ? 404 : 500 }
    )
  }
}

/** PUT — auto-save text content; body: { projectId, path, content } */
export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId, path, content } = await req.json()
    if (!projectId || !path || content === undefined) {
      return NextResponse.json({ error: "projectId, path, content required" }, { status: 400 })
    }
    assertProjectOwned(userId, projectId)
    writeTextFile(userId, projectId, path, String(content))
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
  } catch (error: any) {
    console.error("PUT files failed:", error)
    return NextResponse.json({ error: error.message || "Save failed" }, { status: 500 })
  }
}

/** POST — create file/folder; body: { projectId, path, type: "file"|"dir", content? } */
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { projectId, path, type = "file", content } = body
    if (!projectId || !path) {
      return NextResponse.json({ error: "projectId and path required" }, { status: 400 })
    }
    assertProjectOwned(userId, projectId)
    if (type === "dir") {
      createEmptyFile(userId, projectId, path, true)
    } else if (typeof content === "string") {
      writeTextFile(userId, projectId, path, content)
    } else {
      createEmptyFile(userId, projectId, path, false)
    }
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("POST files failed:", error)
    return NextResponse.json({ error: error.message || "Create failed" }, { status: 500 })
  }
}
