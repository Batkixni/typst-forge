"use client"

import { authClient } from "@/lib/auth-client"
import { GithubIcon } from "@/components/GithubIcon"

export default function GitHubAuthButton({
  label,
  variant = "primary",
}: {
  label: string
  variant?: "primary" | "secondary"
}) {
  const baseClass =
    "flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full sm:w-auto"
  const variantClass =
    variant === "primary"
      ? "bg-accent text-black hover:bg-accent-hover shadow-lg shadow-accent/10"
      : "bg-bg-secondary text-text-primary border border-border-primary hover:bg-bg-hover hover:border-border-secondary"

  return (
    <button
      onClick={() => authClient.signIn.social({ provider: "github" })}
      className={`${baseClass} ${variantClass}`}
    >
      <GithubIcon size={18} />
      {label}
    </button>
  )
}
