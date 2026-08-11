import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCount, getSettings } from "@/lib/db"
import { FileText, Sparkles } from "lucide-react"
import GitHubAuthButton from "@/components/GitHubAuthButton"

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
    <div className="flex-1 min-h-full flex flex-col items-center justify-center px-6 relative overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/[0.07] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg animate-fade-in">
        <div className="mb-8 relative">
          <div className="absolute inset-0 rounded-3xl bg-accent/20 blur-2xl" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center shadow-2xl shadow-accent/10">
            <FileText size={36} className="text-accent" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent mb-6">
          <Sparkles size={12} />
          Self-hosted Typst editor
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary mb-4">
          Typst <span className="text-accent">Forge</span>
        </h1>

        <p className="text-base sm:text-lg text-text-tertiary mb-2 max-w-md leading-relaxed">
          Write and compile Typst documents with local auto-save and live preview.
        </p>
        <p className="text-sm text-text-muted mb-10">
          Private. Fast. Git optional.
        </p>

        {accessDenied && (
          <div className="w-full mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
            Registration is closed. Sign in with an existing account.
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <GitHubAuthButton label="Sign in with GitHub" variant="primary" />
          {settings.allowRegistration && (
            <GitHubAuthButton label="Sign up with GitHub" variant="secondary" />
          )}
        </div>

        <p className="mt-8 text-xs text-text-muted">
          {settings.allowRegistration
            ? "Only GitHub accounts authorized by the admin can access this instance."
            : "This instance is invite-only. Contact your admin for access."}
        </p>
      </div>
    </div>
  )
}
