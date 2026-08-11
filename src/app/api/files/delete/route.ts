import { getServerSession } from "@/lib/auth"
import { assertProjectOwned, deleteProjectPath, getUserId } from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId, path } = await req.json()
    if (!projectId || !path) {
      return NextResponse.json({ error: "projectId and path required" }, { status: 400 })
    }
    assertProjectOwned(userId, projectId)
    deleteProjectPath(userId, projectId, path)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Delete failed:", error)
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 })
  }
}
