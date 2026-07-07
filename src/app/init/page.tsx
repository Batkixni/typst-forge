import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCount } from "@/lib/db"
import { Rocket } from "lucide-react"
import LoginButton from "@/components/LoginButton"

export default async function InitPage() {
  const session = await auth()
  if (session) redirect("/projects")

  const userCount = getUserCount()
  if (userCount > 0) redirect("/")

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-lg animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/5">
          <Rocket size={32} className="text-accent" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Typst <span className="text-accent">Forge</span>
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            First-time setup — sign in with GitHub to create the admin account
            and initialize the workspace.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-full max-w-sm flex flex-col items-center gap-4 p-6 rounded-2xl bg-bg-secondary border border-border-primary">
            <Rocket size={20} className="text-accent" />
            <p className="text-xs text-text-tertiary max-w-[240px]">
              You are the first visitor. Signing in will grant you admin
              privileges and unlock the app.
            </p>
            <LoginButton label="Initialize with GitHub" />
          </div>
        </div>
      </div>
    </div>
  )
}
