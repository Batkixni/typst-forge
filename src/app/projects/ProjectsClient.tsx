"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import type { GitHubRepo, LocalProject } from "@/types"
import ProjectCard from "@/components/ProjectCard"
import {
  Search,
  RefreshCw,
  FolderKanban,
  Shield,
  Plus,
  Loader2,
  X,
  Download,
  HardDrive,
} from "lucide-react"

export default function ProjectsClient() {
  const { data: session } = authClient.useSession()
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [importSearch, setImportSearch] = useState("")
  const [importing, setImporting] = useState(false)

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Failed to fetch")
      setProjects(await res.json())
    } catch {
      setError("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.user) return
    loadProjects()
  }, [session?.user])

  async function createProject(e: React.FormEvent) {
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
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error)
        return
      }
      const meta: LocalProject = await res.json()
      setShowNew(false)
      setNewName("")
      setNewDesc("")
      window.location.href = `/editor/${meta.id}`
    } catch (err: any) {
      alert(err.message || "Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  async function openImport() {
    setShowImport(true)
    try {
      const res = await fetch("/api/github/repos")
      if (res.ok) setRepos(await res.json())
    } catch {
      setRepos([])
    }
  }

  async function importRepo(fullName: string) {
    const [owner, repo] = fullName.split("/")
    if (!owner || !repo) return
    setImporting(true)
    try {
      // Create empty local project then pull remote into it
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repo,
          description: `Imported from ${fullName}`,
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json()
        alert(err.error)
        return
      }
      const meta: LocalProject = await createRes.json()
      const gitRes = await fetch(`/api/projects/${meta.id}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", owner, repo }),
      })
      if (!gitRes.ok) {
        const err = await gitRes.json()
        alert(err.error || "Import failed")
        // still open the empty project
      }
      window.location.href = `/editor/${meta.id}`
    } catch (e: any) {
      alert(e.message || "Import failed")
    } finally {
      setImporting(false)
    }
  }

  async function deleteProject(id: string, name: string) {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
    if (res.ok) loadProjects()
    else {
      const err = await res.json()
      alert(err.error || "Delete failed")
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.git
        ? `${p.git.owner}/${p.git.repo}`.toLowerCase().includes(search.toLowerCase())
        : false)
  )

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(importSearch.toLowerCase()) ||
      r.full_name.toLowerCase().includes(importSearch.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col px-6 py-6 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-text-tertiary mt-0.5 flex items-center gap-1.5">
            <HardDrive size={13} />
            Stored on this server · Git is optional
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-primary bg-accent/15 border border-accent/30 rounded-lg hover:bg-accent/25 transition-colors"
          >
            <Plus size={14} />
            New Project
          </button>
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <Download size={14} />
            Import GitHub
          </button>
          {(session?.user as { role?: string })?.role === "admin" && (
            <a
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              <Shield size={14} />
              Admin
            </a>
          )}
          <button
            onClick={loadProjects}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
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
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        />
      </div>

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
          onClick={() => setShowNew(false)}
        >
          <div
            className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-text-primary">
                New local project
              </h2>
              <button
                onClick={() => setShowNew(false)}
                className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              Files are saved on the server disk automatically. You can bind a
              GitHub repo later if you want version control.
            </p>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">
                  Project name *
                </label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="my-typst-doc"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">
                  Description
                </label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-accent text-black rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-all"
                >
                  {creating ? (
                    <Loader2 size={14} className="animate-spin mx-auto" />
                  ) : (
                    "Create"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-sm text-text-secondary bg-bg-tertiary rounded-lg hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
          onClick={() => setShowImport(false)}
        >
          <div
            className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">
                Import from GitHub
              </h2>
              <button
                onClick={() => setShowImport(false)}
                className="p-1 rounded text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-tertiary mb-3">
              Copies the repo into local storage and binds Git for optional
              manual push later.
            </p>
            <input
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="Search repositories…"
              className="w-full px-3 py-2 mb-3 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary outline-none focus:border-accent/50"
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {importing && (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-accent" />
                </div>
              )}
              {!importing &&
                filteredRepos.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => importRepo(r.full_name)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-text-tertiary ml-2">
                      {r.full_name}
                    </span>
                  </button>
                ))}
              {!importing && filteredRepos.length === 0 && (
                <p className="text-xs text-text-tertiary text-center py-6">
                  No repositories found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-bg-tertiary animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
          <p className="text-sm text-text-tertiary">{error}</p>
          <button
            onClick={loadProjects}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
              <FolderKanban size={32} className="text-text-tertiary/40" />
              <p className="text-sm text-text-tertiary">
                {search
                  ? "No projects match your search"
                  : "No projects yet — create one or import from GitHub"}
              </p>
              {!search && (
                <button
                  onClick={() => setShowNew(true)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent border border-accent/30 rounded-lg hover:bg-accent/10"
                >
                  <Plus size={14} />
                  New Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onDelete={() => deleteProject(p.id, p.name)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
