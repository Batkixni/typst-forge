import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCount } from "@/lib/db"
import { FileText } from "lucide-react"
import LoginButton from "@/components/LoginButton"
import { GithubIcon } from "@/components/GithubIcon"

export default async function HomePage() {
  const session = await auth()
  if (session) redirect("/projects")

  const userCount = getUserCount()
  if (userCount === 0) redirect("/init")

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-lg animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/5">
          <FileText size={32} className="text-accent" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Typst <span className="text-accent">Forge</span>
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            A modern collaborative editor for Typst, synced with your GitHub
            repositories.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-full max-w-sm flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-secondary border border-border-primary">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <GithubIcon size={16} />
              <span>Sign in with GitHub to continue</span>
            </div>
            <LoginButton />
          </div>

          <div className="flex items-center gap-8 text-xs text-text-tertiary">
            <span>GitHub sync</span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>Real-time preview</span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>Typst 0.12+</span>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
            {[
              { label: "Open repos", value: "All" },
              { label: "Auto-save", value: "Git" },
              { label: "Preview", value: "Live PDF" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-bg-tertiary border border-border-secondary">
                <div className="text-xs font-medium text-accent mb-0.5">{item.value}</div>
                <div className="text-[10px] text-text-tertiary">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
