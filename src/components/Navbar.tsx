"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home } from "lucide-react"
import { GithubIcon } from "@/components/GithubIcon"
import LoginButton from "./LoginButton"

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (pathname.startsWith("/editor/")) return null

  return (
    <nav className="flex items-center justify-between px-6 h-14 border-b border-border-secondary bg-bg-primary/80 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <FileText size={16} className="text-accent" />
        </div>
        <span className="font-semibold text-text-primary tracking-tight">
          Typst
          <span className="text-accent font-normal">Forge</span>
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {session && (
          <>
            <Link
              href="/projects"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Home size={14} />
              Projects
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <GithubIcon size={14} />
            </a>
          </>
        )}
        <LoginButton />
      </div>
    </nav>
  )
}
