"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import type { GitHubRepo } from "@/types"
import ProjectCard from "@/components/ProjectCard"
import { Search, RefreshCw, FolderKanban, Shield, Plus, Loader2, X } from "lucide-react"
import { GithubIcon } from "@/components/GithubIcon"

export default function ProjectsClient() {
  const { data: session } = authClient.useSession()
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newPrivate, setNewPrivate] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!(session?.session as { accessToken?: string })?.accessToken) return

    const fetchRepos = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/projects")
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        setRepos(data.filter((r: GitHubRepo) => r.language === "Typst"))
      } catch (err) {
        setError("Failed to load repositories")
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [(session?.session as { accessToken?: string })?.accessToken])

  async function createRepo(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          private: newPrivate,
        }),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error); return }
      setShowNew(false)
      setNewName("")
      setNewDesc("")
      setCreating(false)
      // re-fetch to include the new repo
      const refresh = await fetch("/api/projects")
      if (refresh.ok) setRepos((await refresh.json()).filter((r: GitHubRepo) => r.language === "Typst"))
    } catch (err: any) {
      alert(err.message || "Failed to create repo")
    } finally {
      setCreating(false)
    }
  }

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col px-6 py-6 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Select a GitHub repository to edit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-primary bg-accent/15 border border-accent/30 rounded-lg hover:bg-accent/25 transition-colors">
            <Plus size={14} />
            New Repo
          </button>
          {(session?.user as { role?: string })?.role === "admin" && (
            <a href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors">
              <Shield size={14} />
              Admin
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} />
            Sync
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Search repositories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        />
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-text-primary">New Typst Repository</h2>
              <button onClick={() => setShowNew(false)} className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={createRepo} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Repository name *</label>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="my-typst-doc" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Description</label>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="Optional description" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newPrivate} onChange={(e) => setNewPrivate(e.target.checked)}
                  className="accent-accent" />
                <span className="text-sm text-text-secondary">Private repository</span>
              </label>
              <div className="flex items-center gap-2 pt-2">
                <button type="submit" disabled={creating || !newName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-accent text-black rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-all">
                  {creating ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Create"}
                </button>
                <button type="button" onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-sm text-text-secondary bg-bg-tertiary rounded-lg hover:text-text-primary hover:bg-bg-hover transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-bg-tertiary animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <GithubIcon size={24} className="text-red-400/60" />
          </div>
          <p className="text-sm text-text-tertiary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
              <FolderKanban size={32} className="text-text-tertiary/40" />
              <p className="text-sm text-text-tertiary">
                {search
                  ? "No repositories match your search"
                  : "No repositories found"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((repo) => (
                <ProjectCard key={repo.id} repo={repo} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
