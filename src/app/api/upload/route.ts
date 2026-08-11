import { getServerSession } from "@/lib/auth"
import { assertProjectOwned, getUserId, writeBinaryFile } from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const projectId = formData.get("projectId") as string | null
    const filePath = formData.get("path") as string | null

    if (!file || !projectId || !filePath) {
      return NextResponse.json(
        { error: "file, projectId, and path required" },
        { status: 400 }
      )
    }

    assertProjectOwned(userId, projectId)
    const buffer = Buffer.from(await file.arrayBuffer())
    writeBinaryFile(userId, projectId, filePath, buffer)

    return NextResponse.json({
      path: filePath,
      name: file.name,
      size: file.size,
    })
  } catch (error: any) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
