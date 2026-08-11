import { getServerSession } from "@/lib/auth"
import {
  assertProjectOwned,
  deleteProject,
  getUserId,
  readMeta,
  writeMeta,
} from "@/lib/projects"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const meta = assertProjectOwned(userId, id)
    return NextResponse.json(meta)
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const meta = assertProjectOwned(userId, id)
    const body = await req.json()
    if (typeof body.name === "string" && body.name.trim()) meta.name = body.name.trim()
    if (typeof body.description === "string") meta.description = body.description
    if (typeof body.entry === "string") meta.entry = body.entry
    meta.updatedAt = new Date().toISOString()
    writeMeta(userId, id, meta)
    return NextResponse.json(meta)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!readMeta(userId, id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }
  deleteProject(userId, id)
  return NextResponse.json({ ok: true })
}
