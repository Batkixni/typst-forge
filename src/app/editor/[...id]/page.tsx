import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import EditorClient from "./EditorClient"

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string[] }>
}) {
  const session = await auth()
  if (!session) redirect("/")

  const { id } = await params
  const projectId = id.join("/")
  return <EditorClient projectId={projectId} />
}
