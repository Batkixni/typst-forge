import { getServerSession } from "@/lib/auth"
import { createProject, getUserId, listProjects } from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const projects = listProjects(userId)
    return NextResponse.json(projects)
  } catch (error) {
    console.error("Failed to list projects:", error)
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = (body.name as string)?.trim()
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }
    const meta = createProject(userId, {
      name,
      description: body.description || "",
      entryContent: body.entryContent,
    })
    return NextResponse.json(meta)
  } catch (error: any) {
    console.error("Failed to create project:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status: 500 }
    )
  }
}
