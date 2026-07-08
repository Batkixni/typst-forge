"use client"

import { useState, useMemo, useCallback } from "react"
import { Search, FileText, Loader2, X, ChevronRight } from "lucide-react"
import { useEditorStore } from "@/store/editor"
import { authClient } from "@/lib/auth-client"
import { getFileContent } from "@/lib/github"
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
  "typ", "txt", "md", "json", "toml", "yaml", "yml", "css", "scss", "html", "js", "ts", "tsx", "jsx", "py", "rs", "c", "cpp", "h", "hpp", "go", "java", "kt", "swift", "sh", "bash", "zsh", "ps1", "rb", "php", "lua", "r", "m", "mm", "sql", "graphql", "tex", "bib",
])

function isTextFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase()
  return ext ? TEXT_EXTS.has(ext) : true
}

export default function CodebaseSearch() {
  const { files, owner, repo, setCurrentFile } = useEditorStore()
  const { data: session } = authClient.useSession()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [nameResults, setNameResults] = useState<ProjectFile[]>([])
  const [contentResults, setContentResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  const allFiles = useMemo(() => collectFiles(files), [files])

  const doSearch = useCallback(async () => {
    const q = query.trim().toLowerCase()
    if (!q) return

    setSearching(true)
    setSearched(false)

    const matchedNames = allFiles.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
    setNameResults(matchedNames)

    const accessToken = (session?.session as { accessToken?: string })?.accessToken
    const contentMatches: SearchResult[] = []

    if (accessToken && owner && repo) {
      const textFiles = allFiles.filter((f) => isTextFile(f.path))
      await Promise.all(
        textFiles.map(async (f) => {
          try {
            const content = await getFileContent(accessToken, owner, repo, f.path)
            const lines = content.split("\n")
            const matches: { line: number; text: string }[] = []
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(q)) {
                matches.push({ line: idx + 1, text: line.trim() })
              }
            })
            if (matches.length > 0) {
              contentMatches.push({ path: f.path, name: f.name, matches: matches.slice(0, 3) })
            }
          } catch (err) {
            // ignore binary or unreadable files
          }
        })
      )
    }

    setContentResults(contentMatches)
    setSearching(false)
    setSearched(true)
  }, [query, allFiles, owner, repo, session])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch()
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-secondary">
        <Search size={13} className="text-text-tertiary" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Search</span>
      </div>

      <div className="px-3 py-2 border-b border-border-secondary">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files or code..."
            className="w-full bg-bg-tertiary text-text-primary text-xs pl-3 pr-16 py-1.5 rounded border border-border-secondary outline-none focus:border-accent/50"
          />
          <button
            onClick={doSearch}
            disabled={searching || !query.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-medium bg-accent text-black rounded disabled:opacity-40 hover:bg-accent-hover transition-colors"
          >
            {searching ? <Loader2 size={10} className="animate-spin" /> : "Go"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!searched && !searching && (
          <div className="text-center text-xs text-text-tertiary py-8">
            Type a query and press Enter to search
          </div>
        )}

        {searched && nameResults.length === 0 && contentResults.length === 0 && (
          <div className="text-center text-xs text-text-tertiary py-8">No results</div>
        )}

        {nameResults.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary px-2 py-1">Files</div>
            {nameResults.map((f) => (
              <button
                key={f.path}
                onClick={() => setCurrentFile(f.path)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded text-left transition-colors"
              >
                <FileText size={12} className="text-text-tertiary shrink-0" />
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>
        )}

        {contentResults.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary px-2 py-1">Code matches</div>
            {contentResults.map((r) => (
              <div key={r.path} className="mb-2">
                <button
                  onClick={() => setCurrentFile(r.path)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs text-text-primary hover:bg-bg-hover rounded text-left transition-colors"
                >
                  <ChevronRight size={12} className="text-text-tertiary shrink-0" />
                  <span className="truncate font-medium">{r.path}</span>
                </button>
                {r.matches.map((m, i) => (
                  <div
                    key={i}
                    className="ml-5 pl-2 pr-1 py-0.5 text-[10px] text-text-tertiary border-l border-border-secondary truncate font-mono"
                  >
                    L{m.line}: {m.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
