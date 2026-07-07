import { getServerSession, getAccessToken } from "@/lib/auth"
import { listRepos, createTypstRepo } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession()
  if (!getAccessToken(session?.session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = getAccessToken(session!.session)!

  try {
    const repos = await listRepos(accessToken)
    return NextResponse.json(repos)
  } catch (error) {
    console.error("Failed to fetch repos:", error)
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!getAccessToken(session?.session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = getAccessToken(session!.session)!

  try {
    const { name, description, private: isPrivate } = await req.json()
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }
    const fullName = await createTypstRepo(
      accessToken,
      name,
      description || "",
      isPrivate ?? true
    )
    return NextResponse.json({ full_name: fullName })
  } catch (error: any) {
    console.error("Failed to create repo:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create repository" },
      { status: 500 }
    )
  }
}
