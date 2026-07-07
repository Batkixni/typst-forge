"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { LogOut, ChevronDown, User } from "lucide-react"
import { GithubIcon } from "@/components/GithubIcon"

export default function LoginButton({ label }: { label?: string }) {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary bg-bg-tertiary border border-border-primary hover:bg-bg-hover hover:text-text-primary transition-all duration-200">
          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={12} className="text-accent" />
            )}
          </div>
          <span className="max-w-[120px] truncate">
            {session.user?.name || session.user?.email}
          </span>
          <ChevronDown size={14} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
        </button>
        <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-bg-elevated border border-border-primary rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-50">
          <div className="px-3 py-2 text-xs text-text-tertiary border-b border-border-secondary">
            Signed in as <span className="text-text-secondary">{session.user?.name}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-red-400 hover:bg-bg-hover transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/10"
    >
      <GithubIcon size={16} />
      {label || "Sign in with GitHub"}
    </button>
  )
}
