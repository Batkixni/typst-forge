import { auth } from "@/lib/auth"
import { deleteFile } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { path, owner, repo, message } = await req.json()
    if (!path || !owner || !repo) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    await deleteFile(session.accessToken, owner, repo, path, message || `Delete ${path}`)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Delete failed:", error)
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 })
  }
}
