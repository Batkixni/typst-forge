import { getServerSession, getAccessToken } from "@/lib/auth"
import { renameFile } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!getAccessToken(session?.session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = getAccessToken(session!.session)!

  try {
    const { oldPath, newPath, owner, repo, message } = await req.json()
    if (!oldPath || !newPath || !owner || !repo) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    await renameFile(accessToken, owner, repo, oldPath, newPath, message || `Rename ${oldPath} to ${newPath}`)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Rename failed:", error)
    return NextResponse.json({ error: error.message || "Rename failed" }, { status: 500 })
  }
}
