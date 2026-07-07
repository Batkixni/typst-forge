import { auth } from "@/lib/auth"
import { listRepos, createTypstRepo } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const repos = await listRepos(session.accessToken)
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
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, description, private: isPrivate } = await req.json()
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }
    const fullName = await createTypstRepo(
      session.accessToken,
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
