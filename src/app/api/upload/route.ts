import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "data", "uploads")

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const owner = formData.get("owner") as string | null
    const repo = formData.get("repo") as string | null
    const filePath = formData.get("path") as string | null

    if (!file || !owner || !repo || !filePath) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const destDir = join(UPLOAD_DIR, owner, repo)
    const destPath = join(destDir, filePath)

    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parent = destPath.substring(0, destPath.lastIndexOf("\\"))
    if (!existsSync(parent)) {
      await mkdir(parent, { recursive: true })
    }
    await writeFile(destPath, buffer)

    return NextResponse.json({ path: filePath, name: file.name, size: file.size })
  } catch (error: any) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
