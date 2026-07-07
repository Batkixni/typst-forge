"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, Shield, Users, ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [settings, setSettings] = useState<{ allowRegistration: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) { router.push("/"); return }
    if (session.user.role !== "admin") { router.push("/projects"); return }
    fetchAll()
  }, [status, session])

  async function fetchAll() {
    setLoading(true)
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/settings"),
      ])
      if (usersRes.ok) setUsers(await usersRes.json())
      if (settingsRes.ok) setSettings(await settingsRes.json())
    } catch (err) {
      console.error("Failed to load admin data:", err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRegistration() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowRegistration: !settings.allowRegistration }),
      })
      if (res.ok) setSettings(await res.json())
    } catch (err) {
      console.error("Failed to update settings:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/projects")} className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} />
        </button>
        <Shield size={20} className="text-accent" />
        <h1 className="text-lg font-semibold">Admin</h1>
      </div>

      <section className="mb-8 bg-bg-secondary rounded-lg p-5 border border-border-secondary">
        <h2 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">Registration</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Allow new users to register</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {settings?.allowRegistration
                ? "Anyone with a GitHub account can sign in"
                : "Only existing users can sign in"}
            </p>
          </div>
          <button onClick={toggleRegistration} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              settings?.allowRegistration
                ? "bg-accent/20 text-accent hover:bg-accent/30"
                : "bg-bg-tertiary text-text-tertiary hover:text-text-primary"
            }`}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : settings?.allowRegistration ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {settings?.allowRegistration ? "Open" : "Closed"}
          </button>
        </div>
      </section>

      <section className="bg-bg-secondary rounded-lg border border-border-secondary overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border-secondary">
          <Users size={16} className="text-text-tertiary" />
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Users ({users.length})</h2>
        </div>
        <div className="divide-y divide-border-secondary">
          {users.length === 0 ? (
            <p className="text-sm text-text-tertiary p-5">No users</p>
          ) : (
            users.map((user) => (
              <div key={user.githubId} className="flex items-center gap-3 px-5 py-3">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-bg-tertiary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-tertiary">ID: {user.githubId}</p>
                </div>
                {user.role === "admin" && (
                  <span className="text-[10px] font-medium text-accent bg-accent/15 px-2 py-0.5 rounded uppercase tracking-wider">Admin</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
