"use client"

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session && !isPending) {
      router.push("/")
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-text-tertiary">Authenticating…</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
