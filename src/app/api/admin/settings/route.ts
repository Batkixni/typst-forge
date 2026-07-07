import { getServerSession } from "@/lib/auth"
import { getSettings, setSettings, findUser } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession()
  const role = (session!.user as { role?: string }).role
  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(getSettings())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const role = (session!.user as { role?: string }).role
  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const body = await req.json()
    if (typeof body.allowRegistration !== "boolean") {
      return NextResponse.json({ error: "allowRegistration must be boolean" }, { status: 400 })
    }
    return NextResponse.json(setSettings({ allowRegistration: body.allowRegistration }))
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
}
