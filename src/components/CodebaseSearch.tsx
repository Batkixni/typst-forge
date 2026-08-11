"use client"

import { useState, useMemo, useCallback } from "react"
import { Search, FileText, Loader2, X, ChevronRight } from "lucide-react"
import { useEditorStore } from "@/store/editor"
import { cn } from "@/lib/utils"
import type { ProjectFile } from "@/types"

interface SearchResult {
  path: string
  name: string
  matches: { line: number; text: string }[]
}

function collectFiles(files: ProjectFile[]): ProjectFile[] {
  const result: ProjectFile[] = []
  for (const f of files) {
    if (f.type === "file") result.push(f)
    if (f.children) result.push(...collectFiles(f.children))
  }
  return result
}

const TEXT_EXTS = new Set([
  "typ", "txt", "md", "json", "toml", "yaml", "yml", "css", "scss", "html",
  "js", "ts", "tsx", "jsx", "py", "rs", "c", "cpp", "h", "hpp", "go", "java",
  "kt", "swift", "sh", "bash", "zsh", "ps1", "rb", "php", "lua", "r", "sql",
  "tex", "bib", "svg",
])

function isTextFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase()
  return ext ? TEXT_EXTS.has(ext) : true
}

export default function CodebaseSearch() {
  const { files, projectId, setCurrentFile } = useEditorStore()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [nameResults, setNameResults] = useState<ProjectFile[]>([])
  const [contentResults, setContentResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  const allFiles = useMemo(() => collectFiles(files), [files])

  const doSearch = useCallback(async () => {
    const q = query.trim().toLowerCase()
    if (!q || !projectId) return

    setSearching(true)
    setSearched(false)

    const matchedNames = allFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    )
    setNameResults(matchedNames)

    const contentMatches: SearchResult[] = []
    const textFiles = allFiles.filter((f) => isTextFile(f.path))

    await Promise.all(
      textFiles.map(async (f) => {
        try {
          const res = await fetch(
            `/api/files?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(f.path)}`
          )
          if (!res.ok) return
          const data = await res.json()
          const content = data.content as string
          if (typeof content !== "string") return
          const lines = content.split("\n")
          const matches: { line: number; text: string }[] = []
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(q)) {
              matches.push({ line: idx + 1, text: line.trim() })
            }
          })
          if (matches.length > 0) {
            contentMatches.push({
              path: f.path,
              name: f.name,
              matches: matches.slice(0, 3),
            })
          }
        } catch {
          // ignore
        }
      })
    )

    setContentResults(contentMatches)
    setSearching(false)
    setSearched(true)
  }, [query, allFiles, projectId])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-secondary">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doSearch()
            }}
            placeholder="Search files…"
            className="w-full bg-bg-tertiary text-text-primary text-xs pl-8 pr-8 py-1.5 rounded border border-border-secondary outline-none focus:border-accent/50"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("")
                setSearched(false)
                setNameResults([])
                setContentResults([])
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={doSearch}
          disabled={searching || !query.trim()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-bg-elevated border border-border-secondary rounded text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
        >
          {searching ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Search size={12} />
          )}
          Search
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {searched && nameResults.length === 0 && contentResults.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-6">No results</p>
        )}

        {nameResults.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-2 mb-1">
              File names
            </p>
            {nameResults.map((f) => (
              <button
                key={f.path}
                onClick={() => setCurrentFile(f.path)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded text-left"
              >
                <FileText size={12} className="text-accent shrink-0" />
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>
        )}

        {contentResults.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-2 mb-1">
              Content
            </p>
            {contentResults.map((r) => (
              <div key={r.path} className="mb-2">
                <button
                  onClick={() => setCurrentFile(r.path)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs text-accent hover:underline text-left"
                >
                  <ChevronRight size={10} />
                  {r.path}
                </button>
                {r.matches.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentFile(r.path)}
                    className={cn(
                      "w-full text-left px-3 py-1 text-[11px] text-text-tertiary hover:bg-bg-hover rounded font-mono truncate"
                    )}
                  >
                    <span className="text-text-tertiary/60 mr-2">{m.line}</span>
                    {m.text}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
