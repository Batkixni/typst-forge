import { getServerSession, getAccessToken } from "@/lib/auth"
import { listRepos } from "@/lib/github"
import { NextResponse } from "next/server"

/** List GitHub repos for optional bind / import (not the primary project list). */
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
