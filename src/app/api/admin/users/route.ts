import { getServerSession } from "@/lib/auth"
import { listUsers } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession()
  const role = (session!.user as { role?: string }).role
  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(listUsers())
}
