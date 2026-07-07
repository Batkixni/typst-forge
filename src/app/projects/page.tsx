import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ProjectsClient from "./ProjectsClient"

export default async function ProjectsPage() {
  const session = await auth()
  if (!session) redirect("/")
  return <ProjectsClient />
}
