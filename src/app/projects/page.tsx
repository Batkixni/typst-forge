import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import ProjectsClient from "./ProjectsClient"

export default async function ProjectsPage() {
  const session = await getServerSession()
  if (!session) redirect("/")
  return <ProjectsClient />
}
