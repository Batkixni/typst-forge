import { getServerSession } from "@/lib/auth"
import { assertProjectOwned, getUserId, renameProjectPath } from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId, oldPath, newPath } = await req.json()
    if (!projectId || !oldPath || !newPath) {
      return NextResponse.json(
        { error: "projectId, oldPath, newPath required" },
        { status: 400 }
      )
    }
    assertProjectOwned(userId, projectId)
    renameProjectPath(userId, projectId, oldPath, newPath)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Rename failed:", error)
    return NextResponse.json({ error: error.message || "Rename failed" }, { status: 500 })
  }
}
