import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCount, getSettings } from "@/lib/db"
import { FileText } from "lucide-react"
import LoginButton from "@/components/LoginButton"
import { GithubIcon } from "@/components/GithubIcon"

export default async function HomePage(props: {
  searchParams?: Promise<{ error?: string }>
}) {
  const session = await getServerSession()
  const searchParams = await props.searchParams
  const accessDenied = searchParams?.error === "AccessDenied"

  if (session) redirect("/projects")

  const userCount = getUserCount()
  if (userCount === 0) redirect("/init")

  const settings = getSettings()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/5">
          <FileText size={28} className="text-accent" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Typst <span className="text-accent">Forge</span>
          </h1>
          <p className="text-sm text-text-tertiary">
            Self-hosted Typst editor with GitHub sync
          </p>
        </div>

        <div className="w-full max-w-xs flex flex-col items-center gap-3 p-5 rounded-2xl bg-bg-secondary border border-border-primary">
          {accessDenied && (
            <div className="w-full p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
              Registration is closed. Sign in with an existing account.
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <GithubIcon size={15} />
            <span>{settings.allowRegistration ? "Sign up" : "Sign in"} with GitHub</span>
          </div>
          <LoginButton label={settings.allowRegistration ? "Continue with GitHub" : "Sign in with GitHub"} />
        </div>
      </div>
    </div>
  )
}
