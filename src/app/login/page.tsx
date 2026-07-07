import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCount } from "@/lib/db"
import { FileText } from "lucide-react"
import LoginButton from "@/components/LoginButton"

export default async function LoginPage(props: {
  searchParams?: Promise<{ error?: string }>
}) {
  const session = await auth()
  const searchParams = await props.searchParams
  const accessDenied = searchParams?.error === "AccessDenied"

  if (session) redirect("/projects")

  const userCount = getUserCount()
  if (userCount === 0) redirect("/init")

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-sm animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <FileText size={24} className="text-accent" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Typst <span className="text-accent">Forge</span>
        </h1>

        <div className="w-full flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-secondary border border-border-primary">
          {accessDenied && (
            <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
              Registration is closed. Contact the admin.
            </div>
          )}
          <div className="text-sm text-text-secondary">Sign in to continue</div>
          <LoginButton />
        </div>
      </div>
    </div>
  )
}
