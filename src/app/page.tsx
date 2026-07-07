import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCount } from "@/lib/db"
import { FileText, GitBranch, Eye, Users, Shield, Zap } from "lucide-react"
import LoginButton from "@/components/LoginButton"
import { GithubIcon } from "@/components/GithubIcon"

const features = [
  {
    icon: Eye,
    title: "Live PDF Preview",
    desc: "See your document render in real time as you type. Instant feedback, no waiting.",
  },
  {
    icon: GitBranch,
    title: "GitHub Sync",
    desc: "Clone, edit, and commit directly to your repositories. Full Git workflow built in.",
  },
  {
    icon: FileText,
    title: "Typst 0.12+",
    desc: "The latest Typst compiler with auto-loading of project fonts and assets.",
  },
  {
    icon: Users,
    title: "Collaborative",
    desc: "Multiple users can work on the same project. Role-based access control included.",
  },
  {
    icon: Shield,
    title: "Self-Hosted",
    desc: "Deploy on your own infrastructure. Your documents never leave your control.",
  },
  {
    icon: Zap,
    title: "Auto-Compile",
    desc: "Every save triggers a full compile. Errors are surfaced inline, no terminal needed.",
  },
]

export default async function HomePage() {
  const session = await auth()
  if (session) redirect("/projects")

  const userCount = getUserCount()
  if (userCount === 0) redirect("/init")

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/5">
            <FileText size={32} className="text-accent" />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary leading-[1.1]">
              Typst <span className="text-accent">Forge</span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-xl mx-auto">
              A modern, self-hosted editor for Typst documents. Write, preview, and
              sync with GitHub — all in one place.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="w-full flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-secondary/80 backdrop-blur-sm border border-border-primary">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <GithubIcon size={16} />
                <span>Sign in with GitHub</span>
              </div>
              <LoginButton />
            </div>

            <div className="flex items-center gap-6 text-xs text-text-tertiary">
              <span>Sync</span>
              <span className="w-1 h-1 rounded-full bg-text-tertiary/30" />
              <span>Preview</span>
              <span className="w-1 h-1 rounded-full bg-text-tertiary/30" />
              <span>Compile</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              Everything you need
            </h2>
            <p className="text-sm text-text-tertiary max-w-md mx-auto">
              A focused toolset for serious Typst work — no cruft, no distractions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-2xl bg-bg-secondary border border-border-primary hover:border-accent/20 transition-colors duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <f.icon size={16} className="text-accent" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1.5">
                  {f.title}
                </h3>
                <p className="text-xs text-text-tertiary leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
