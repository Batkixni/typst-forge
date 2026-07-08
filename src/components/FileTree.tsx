"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { useEditorStore } from "@/store/editor"
import { authClient } from "@/lib/auth-client"
import {
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FileType,
  FileText,
  Plus,
  Trash2,
  Loader2,
  X,
  Check,
  Upload,
  Search,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProjectFile } from "@/types"

function FileTextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  )
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "typ": return <FileTextIcon />
    case "json": return <FileType className="text-yellow-400 shrink-0" size={14} />
    case "css": case "scss": return <FileType className="text-blue-400 shrink-0" size={14} />
    case "png": case "jpg": case "jpeg": case "svg": return <FileType className="text-green-400 shrink-0" size={14} />
    default: return <File size={14} className="text-text-tertiary shrink-0" />
  }
}

function RenameForm({ initialName, onSubmit, onCancel, depth, folder }: {
  initialName: string
  onSubmit: (newName: string) => void
  onCancel: () => void
  depth: number
  folder?: boolean
}) {
  const [value, setValue] = useState(initialName)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(value.trim()) }}
      className="flex items-center gap-1 flex-1 min-w-0 px-3 py-1"
      style={{ paddingLeft: folder ? `${12 + depth * 14}px` : `${24 + depth * 14}px` }}
    >
      {folder ? <Folder size={12} className="text-text-tertiary shrink-0" /> : getFileIcon(initialName)}
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 bg-bg-tertiary text-text-primary text-xs px-2 py-1 rounded border border-border-secondary outline-none focus:border-accent/50"
        onKeyDown={(e) => { if (e.key === "Escape") onCancel() }}
      />
      <button type="submit" disabled={!value.trim() || value.trim() === initialName}
        className="p-1 rounded text-accent hover:bg-bg-hover disabled:opacity-30 transition-colors">
        <Check size={12} />
      </button>
      <button type="button" onClick={onCancel}
        className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors">
        <X size={12} />
      </button>
    </form>
  )
}

function TreeNode({ node, depth = 0, onNewFile, onNewFolder, onDelete, renaming, onStartRename, onRename }: {
  node: ProjectFile; depth?: number
  onNewFile: (parentPath: string) => void
  onNewFolder: (parentPath: string) => void
  onDelete: (node: ProjectFile) => void
  renaming: { path: string; name: string } | null
  onStartRename: (node: ProjectFile) => void
  onRename: (node: ProjectFile, newName: string) => void
}) {
  const { currentFilePath, setCurrentFile, expandedPaths, toggleExpanded } = useEditorStore()
  const isExpanded = expandedPaths.has(node.path)
  const isActive = currentFilePath === node.path

  if (node.type === "dir") {
    const isRenaming = renaming?.path === node.path
    return (
      <div>
        <div className="group flex items-center">
          {isRenaming ? (
            <RenameForm
              initialName={node.name}
              onSubmit={(newName) => onRename(node, newName)}
              onCancel={() => onStartRename({ ...node, name: "" })}
              depth={depth}
              folder
            />
          ) : (
            <>
              <button onClick={() => toggleExpanded(node.path)}
                className={cn("file-tree-item flex items-center gap-1 flex-1 min-w-0 text-left text-sm px-3 py-1",
                  "text-text-secondary hover:text-text-primary transition-colors")}
                style={{ paddingLeft: `${12 + depth * 14}px` }}>
                <ChevronRight size={12} className={cn("shrink-0 transition-transform duration-150", isExpanded && "rotate-90")} />
                {isExpanded ? <FolderOpen size={14} className="shrink-0 text-accent" /> : <Folder size={14} className="shrink-0 text-text-tertiary" />}
                <span className="truncate">{node.name}</span>
              </button>
              <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onNewFile(node.path) }}
                  className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors" title="New file">
                  <File size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onNewFolder(node.path) }}
                  className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors" title="New folder">
                  <Folder size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onStartRename(node) }}
                  className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors" title="Rename">
                  <Pencil size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(node) }}
                  className="p-1 rounded text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors" title="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            </>
          )}
        </div>
        {isExpanded && node.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} onNewFile={onNewFile} onNewFolder={onNewFolder} onDelete={onDelete}
            renaming={renaming} onStartRename={onStartRename} onRename={onRename} />
        ))}
      </div>
    )
  }

  const isRenaming = renaming?.path === node.path
  return (
    <div className="group flex items-center">
      {isRenaming ? (
        <RenameForm
          initialName={node.name}
          onSubmit={(newName) => onRename(node, newName)}
          onCancel={() => onStartRename({ ...node, name: "" })}
          depth={depth}
        />
      ) : (
        <>
          <button onClick={() => setCurrentFile(node.path)}
            className={cn("file-tree-item flex items-center gap-2 flex-1 min-w-0 text-left text-sm px-3 py-1 transition-colors",
              isActive ? "active text-text-primary" : "text-text-secondary hover:text-text-primary")}
            style={{ paddingLeft: `${24 + depth * 14}px` }}>
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
          </button>
          <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onStartRename(node) }}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors" title="Rename">
              <Pencil size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(node) }}
              className="p-1 rounded text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors" title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function FileTree() {
  const { files, isLoading, owner, repo, pendingUploads, addPendingUpload, currentFilePath, setCurrentFile } = useEditorStore()
  const { data: session } = authClient.useSession()
  const refreshFiles = useEditorStore.getState().refreshFiles
  const [creating, setCreating] = useState<{ parentPath: string; type: "file" | "dir" } | null>(null)
  const [renaming, setRenaming] = useState<{ path: string; name: string } | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function filterTree(nodes: ProjectFile[], query: string): ProjectFile[] {
    if (!query.trim()) return nodes
    const q = query.toLowerCase()
    return nodes.reduce<ProjectFile[]>((acc, node) => {
      if (node.type === "file") {
        if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
          acc.push(node)
        }
      } else if (node.children) {
        const filteredChildren = filterTree(node.children, q)
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
          acc.push({ ...node, children: filteredChildren })
        }
      }
      return acc
    }, [])
  }

  const filteredFiles = useMemo(() => filterTree(files, searchQuery), [files, searchQuery])

  useEffect(() => {
    // Auto-expand directories containing search matches
    if (!searchQuery.trim()) return
    const pathsToExpand = new Set<string>()
    function collectParentPaths(nodes: ProjectFile[]) {
      for (const node of nodes) {
        if (node.type === "dir" && node.children) {
          const childMatches = filterTree(node.children, searchQuery).length > 0
          if (childMatches || node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            pathsToExpand.add(node.path)
            collectParentPaths(node.children)
          }
        }
      }
    }
    collectParentPaths(files)
    if (pathsToExpand.size > 0) {
      useEditorStore.setState((s) => {
        const next = new Set(s.expandedPaths)
        pathsToExpand.forEach((p) => next.add(p))
        return { expandedPaths: next }
      })
    }
  }, [searchQuery, files])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !(session?.session as { accessToken?: string })?.accessToken || !owner || !repo || !creating) return
    setSaving(true)
    try {
      const filePath = creating.parentPath ? `${creating.parentPath}/${name.trim()}` : name.trim()
      const finalPath = creating.type === "dir" ? `${filePath}/.gitkeep` : filePath
      const content = creating.type === "dir" ? "" : ""
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: finalPath,
          content,
          owner,
          repo,
          message: `Create ${creating.type === "dir" ? "directory" : "file"} ${name.trim()}`,
        }),
      })
      if (!res.ok) { const err = await res.json(); console.error("Create error:", err.error) }
      refreshFiles()
    } catch (err) {
      console.error("Create failed:", err)
    } finally {
      setSaving(false)
      setCreating(null)
      setName("")
    }
  }

  async function handleDelete(node: ProjectFile) {
    if (!(session?.session as { accessToken?: string })?.accessToken || !owner || !repo) return
    const ok = confirm(`Delete ${node.type === "dir" ? "directory" : "file"} "${node.name}"?`)
    if (!ok) return

    try {
      if (node.type === "dir") {
        const allFiles = collectAllFiles(node)
        for (const f of allFiles) {
          await fetch("/api/files/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: f, owner, repo, message: `Delete ${f}` }),
          })
        }
      } else {
        await fetch("/api/files/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: node.path, owner, repo, message: `Delete ${node.path}` }),
        })
      }
      refreshFiles()
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  async function handleRename(node: ProjectFile, newName: string) {
    if (!newName || newName === node.name || !(session?.session as { accessToken?: string })?.accessToken || !owner || !repo) return
    setSaving(true)
    try {
      const parentPath = node.path.split("/").slice(0, -1).join("/")
      const newPath = parentPath ? `${parentPath}/${newName}` : newName
      const res = await fetch("/api/files/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPath: node.path,
          newPath,
          owner,
          repo,
          message: `Rename ${node.path} to ${newPath}`,
        }),
      })
      if (!res.ok) { const err = await res.json(); console.error("Rename error:", err.error); return }
      if (currentFilePath === node.path) setCurrentFile(newPath)
      refreshFiles()
    } catch (err) {
      console.error("Rename failed:", err)
    } finally {
      setSaving(false)
      setRenaming(null)
    }
  }

  function collectAllFiles(node: ProjectFile): string[] {
    if (node.type === "file") return [node.path]
    const result: string[] = []
    for (const child of node.children || []) {
      result.push(...collectAllFiles(child))
    }
    return result
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-5 bg-bg-tertiary rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        ))}
      </div>
    )
  }

  const rootActions = [{ label: "New file", type: "file" as const }, { label: "New folder", type: "dir" as const }]

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length || !(session?.session as { accessToken?: string })?.accessToken || !owner || !repo) return
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("owner", owner)
        formData.append("repo", repo)
        formData.append("path", file.name)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) { const err = await res.json(); console.error("Upload error:", err.error); continue }
        addPendingUpload({ path: file.name, name: file.name })
      }
      refreshFiles()
    } catch (err) {
      console.error("Upload failed:", err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-end px-3 pb-1">
        <div className="flex items-center gap-0.5">
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded transition-colors">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Upload
          </button>
          {rootActions.map((a) => (
            <button key={a.type} onClick={() => { setCreating({ parentPath: "", type: a.type }); setName("") }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded transition-colors">
              <Plus size={12} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-bg-tertiary text-text-primary text-xs pl-8 pr-7 py-1.5 rounded border border-border-secondary outline-none focus:border-accent/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="flex items-center gap-1 px-3 pb-2" style={{ paddingLeft: "24px" }}>
          {creating.type === "dir" ? <Folder size={12} className="text-text-tertiary shrink-0" /> : <File size={12} className="text-text-tertiary shrink-0" />}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={creating.type === "dir" ? "folder name" : "file name"}
            className="flex-1 bg-bg-tertiary text-text-primary text-xs px-2 py-1 rounded border border-border-secondary outline-none focus:border-accent/50"
            onKeyDown={(e) => { if (e.key === "Escape") { setCreating(null); setName("") }} }
          />
          <button type="submit" disabled={saving || !name.trim()}
            className="p-1 rounded text-accent hover:bg-bg-hover disabled:opacity-30 transition-colors">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button type="button" onClick={() => { setCreating(null); setName("") }}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <X size={12} />
          </button>
        </form>
      )}

      {filteredFiles.length === 0 && pendingUploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-tertiary p-4 text-center mt-8">
          <Folder size={24} className="mb-2 opacity-40" />
          <p className="text-xs">No files</p>
        </div>
      ) : (
        <>
          {filteredFiles.map((file) => (
            <TreeNode key={file.path} node={file} onNewFile={(p) => setCreating({ parentPath: p, type: "file" })}
              onNewFolder={(p) => setCreating({ parentPath: p, type: "dir" })} onDelete={handleDelete}
              renaming={renaming} onStartRename={(n) => setRenaming({ path: n.path, name: n.name })} onRename={handleRename} />
          ))}
          {pendingUploads.length > 0 && (
            <div className="mt-2 border-t border-border-secondary pt-2">
              <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-accent font-medium">Pending uploads</div>
              {pendingUploads.map((u) => (
                <div key={u.path} className="flex items-center gap-2 px-3 py-1 text-sm text-text-secondary"
                  style={{ paddingLeft: "24px" }}>
                  <Upload size={12} className="text-accent shrink-0" />
                  <span className="truncate">{u.path}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
