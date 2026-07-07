import { getServerSession, getAccessToken } from "@/lib/auth"
import { commitFile, commitBinaryFile } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"
import { readFile, unlink, rmdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "data", "uploads")

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!getAccessToken(session?.session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = getAccessToken(session!.session)!

  try {
    const { path, content, owner, repo, message, uploads } = await req.json()

    // Commit text file
    if (path && content !== undefined && owner && repo) {
      await commitFile(
        accessToken,
        owner,
        repo,
        path,
        content,
        message || `Update ${path}`
      )
    }

    // Commit pending uploads
    if (uploads?.length > 0 && owner && repo) {
      const uploadRepoDir = join(UPLOAD_DIR, owner, repo)
      for (const uploadPath of uploads) {
        const src = join(uploadRepoDir, uploadPath)
        if (!existsSync(src)) {
          console.warn(`Upload file not found: ${src}`)
          continue
        }
        const buf = await readFile(src)
        const b64 = buf.toString("base64")
        await commitBinaryFile(
          accessToken,
          owner,
          repo,
          uploadPath,
          b64,
          message || `Add ${uploadPath}`
        )
        await unlink(src)
      }
      // Clean up empty dirs
      await cleanEmptyDirs(uploadRepoDir)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Commit failed:", error)
    return NextResponse.json(
      { error: error.message || "Commit failed" },
      { status: 500 }
    )
  }
}

async function cleanEmptyDirs(dir: string): Promise<void> {
  try {
    const { readdir } = await import("fs/promises")
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await cleanEmptyDirs(full)
        const remaining = await readdir(full)
        if (remaining.length === 0) await rmdir(full)
      }
    }
  } catch {}
}
