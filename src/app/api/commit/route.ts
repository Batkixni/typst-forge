import { auth } from "@/lib/auth"
import { commitFile } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { path, content, owner, repo, message } = await req.json()
    if (!path || content === undefined || !owner || !repo) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    await commitFile(
      session.accessToken,
      owner,
      repo,
      path,
      content,
      message || `Update ${path}`
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Commit failed:", error)
    return NextResponse.json(
      { error: error.message || "Commit failed" },
      { status: 500 }
    )
  }
}
