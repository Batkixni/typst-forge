import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import EditorClient from "./EditorClient"

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string[] }>
}) {
  const session = await getServerSession()
  if (!session) redirect("/")

  const { id } = await params
  // Local project IDs are single UUID segments; keep catch-all for flexibility
  const projectId = id.join("/")
  return <EditorClient projectId={projectId} />
}
