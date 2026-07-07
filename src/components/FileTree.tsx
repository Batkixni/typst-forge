"use client"

import { useState } from "react"
import { useEditorStore } from "@/store/editor"
import { useSession } from "next-auth/react"
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

function TreeNode({ node, depth = 0, onNewFile, onNewFolder, onDelete }: {
  node: ProjectFile; depth?: number
  onNewFile: (parentPath: string) => void
  onNewFolder: (parentPath: string) => void
  onDelete: (node: ProjectFile) => void
}) {
  const { currentFilePath, setCurrentFile, expandedPaths, toggleExpanded } = useEditorStore()
  const isExpanded = expandedPaths.has(node.path)
  const isActive = currentFilePath === node.path

  if (node.type === "dir") {
    return (
      <div>
        <div className="group flex items-center">
          <button onClick={() => toggleExpanded(node.path)}
            className={cn("file-tree-item flex items-center gap-1 flex-1 min-w-0 text-left text-sm px-3 py-1",
              "text-text-secondary hover:text-text-primary transition-colors")}
            style={{ paddingLeft: `${12 + depth * 14}px` }}
          >
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
            <button onClick={(e) => { e.stopPropagation(); onDelete(node) }}
              className="p-1 rounded text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors" title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
        {isExpanded && node.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} onNewFile={onNewFile} onNewFolder={onNewFolder} onDelete={onDelete} />
        ))}
      </div>
    )
  }

  return (
    <div className="group flex items-center">
      <button onClick={() => setCurrentFile(node.path)}
        className={cn("file-tree-item flex items-center gap-2 flex-1 min-w-0 text-left text-sm px-3 py-1 transition-colors",
          isActive ? "active text-text-primary" : "text-text-secondary hover:text-text-primary")}
        style={{ paddingLeft: `${24 + depth * 14}px` }}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
      <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onDelete(node) }}
          className="p-1 rounded text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors" title="Delete">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

export default function FileTree() {
  const { files, isLoading, owner, repo } = useEditorStore()
  const { data: session } = useSession()
  const refreshFiles = useEditorStore.getState().refreshFiles
  const [creating, setCreating] = useState<{ parentPath: string; type: "file" | "dir" } | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !session?.accessToken || !owner || !repo || !creating) return
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
    if (!session?.accessToken || !owner || !repo) return
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

  return (
    <div className="py-2">
      <div className="flex items-center justify-end px-3 pb-1">
        <div className="flex items-center gap-0.5">
          {rootActions.map((a) => (
            <button key={a.type} onClick={() => { setCreating({ parentPath: "", type: a.type }); setName("") }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded transition-colors">
              <Plus size={12} />
              {a.label}
            </button>
          ))}
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
            onKeyDown={(e) => { if (e.key === "Escape") { setCreating(null); setName("") }}}
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

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-tertiary p-4 text-center mt-8">
          <Folder size={24} className="mb-2 opacity-40" />
          <p className="text-xs">No files</p>
        </div>
      ) : (
        files.map((file) => (
          <TreeNode key={file.path} node={file} onNewFile={(p) => setCreating({ parentPath: p, type: "file" })}
            onNewFolder={(p) => setCreating({ parentPath: p, type: "dir" })} onDelete={handleDelete} />
        ))
      )}
    </div>
  )
}
