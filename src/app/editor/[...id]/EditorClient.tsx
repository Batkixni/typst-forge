"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEditorStore } from "@/store/editor"
import FileTree from "@/components/FileTree"
import CodeEditor from "@/components/CodeEditor"
import type { CodeEditorHandle } from "@/components/CodeEditor"
import PreviewPanel from "@/components/PreviewPanel"
import AuthGuard from "@/components/AuthGuard"
import CodebaseSearch from "@/components/CodebaseSearch"
import TypstSymbols from "@/components/TypstSymbols"
import { ResizablePanelGroup } from "@/components/ResizablePanels"
import type { GitHubRepo, LocalProject } from "@/types"
import {
  Loader2,
  ArrowLeft,
  Play,
  FileText,
  FolderTree,
  Eye,
  Code,
  Check,
  Type,
  X,
  ChevronDown,
  Download,
  FileImage,
  Search,
  Grid3X3,
  GitBranch,
  Upload,
  Link2,
  Unlink,
  CloudUpload,
} from "lucide-react"
import { cn } from "@/lib/utils"

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp"])
const BINARY_EXT = new Set(["pdf", ...IMAGE_EXT])

function EditorContent({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const store = useEditorStore()
  const compileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingVersionRef = useRef(0)
  const compileGenRef = useRef(0)
  const [mobilePanel, setMobilePanel] = useState<"files" | "editor" | "preview">("editor")
  const [isMobile, setIsMobile] = useState(false)
  const [showFonts, setShowFonts] = useState(false)
  const [fontList, setFontList] = useState<{ family: string; styles: string }[]>([])
  const [fontFiles, setFontFiles] = useState<
    { path: string; size: number; isLfsPointer: boolean }[]
  >([])
  const [fontLfs, setFontLfs] = useState<string[]>([])
  const [loadingFonts, setLoadingFonts] = useState(false)
  const [fontError, setFontError] = useState("")
  const [fontWarning, setFontWarning] = useState("")
  const [compileError, setCompileError] = useState("")
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [leftTab, setLeftTab] = useState<"files" | "search" | "symbols">("files")
  const [showGitMenu, setShowGitMenu] = useState(false)
  const [gitBusy, setGitBusy] = useState(false)
  const [commitMsg, setCommitMsg] = useState("")
  const [showCommit, setShowCommit] = useState(false)
  const [bindRepos, setBindRepos] = useState<GitHubRepo[]>([])
  const [showBind, setShowBind] = useState(false)
  const [bindSearch, setBindSearch] = useState("")
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const gitMenuRef = useRef<HTMLDivElement>(null)
  const codeEditorRef = useRef<CodeEditorHandle>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Load project meta + file tree
  useEffect(() => {
    if (!session?.user || !projectId) return
    ;(async () => {
      try {
        store.setIsLoading(true)
        const res = await fetch(`/api/projects/${projectId}`)
        if (!res.ok) {
          router.push("/projects")
          return
        }
        const meta: LocalProject = await res.json()
        store.setProject(meta)
        await reloadTree()
      } catch (err) {
        console.error("Failed to load project:", err)
        router.push("/projects")
      }
    })()
  }, [session?.user, projectId])

  async function reloadTree() {
    const res = await fetch(`/api/files?projectId=${encodeURIComponent(projectId)}`)
    if (!res.ok) throw new Error("Failed to load files")
    const data = await res.json()
    store.setFiles(data.files || [])

    const state = useEditorStore.getState()
    if (!state.currentFilePath) {
      const first = findFirstFile(data.files || [], ".typ")
      if (first) store.setCurrentFile(first.path)
    }
  }

  useEffect(() => {
    if (!store.projectId) return
    reloadTree().catch(console.error)
  }, [store.refreshTrigger])

  // File switching
  useEffect(() => {
    if (!store.currentFilePath || !store.projectId) return
    const ext = store.currentFilePath.split(".").pop()?.toLowerCase() || ""

    if (BINARY_EXT.has(ext)) {
      store.setPreviewType(ext === "pdf" ? "pdf" : "image")
      loadBinaryPreview(store.currentFilePath)
      store.setCurrentContent("")
      store.setOriginalContent("")
    } else {
      loadFile(store.currentFilePath)
    }
  }, [store.currentFilePath, store.projectId])

  // Live preview
  useEffect(() => {
    if (!store.currentFilePath?.endsWith(".typ") || !store.currentContent) return
    if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current)
    compileTimeoutRef.current = setTimeout(() => doCompile(), 450)
    return () => {
      if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current)
    }
  }, [store.currentContent, store.currentFilePath])

  // Local auto-save (disk) — NOT git
  useEffect(() => {
    if (!store.projectId || !store.currentFilePath) return
    if (store.currentContent === store.originalContent) return
    const isBinary = BINARY_EXT.has(
      store.currentFilePath.split(".").pop()?.toLowerCase() || ""
    )
    if (isBinary) return

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => doLocalSave(), 600)
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [store.currentContent, store.currentFilePath, store.originalContent, store.projectId])

  async function doLocalSave() {
    const state = useEditorStore.getState()
    if (!state.projectId || !state.currentFilePath) return
    if (state.currentContent === state.originalContent) return
    const version = ++savingVersionRef.current
    store.setIsSaving(true)
    try {
      const res = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: state.projectId,
          path: state.currentFilePath,
          content: state.currentContent,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error("Save error:", err.error)
        return
      }
      const data = await res.json()
      if (version === savingVersionRef.current) {
        store.setOriginalContent(state.currentContent)
        store.setLastSavedAt(data.savedAt || new Date().toISOString())
      }
    } catch (err) {
      console.error("Save failed:", err)
    } finally {
      store.setIsSaving(false)
    }
  }

  async function loadFile(path: string) {
    if (!store.projectId && !projectId) return
    const pid = store.projectId || projectId
    try {
      store.setIsCompiling(false)
      store.setPreviewUrl(null)
      store.setPreviewPages(null)
      store.setPreviewType("none")
      const res = await fetch(
        `/api/files?projectId=${encodeURIComponent(pid)}&path=${encodeURIComponent(path)}`
      )
      if (!res.ok) throw new Error("Failed to load file")
      const data = await res.json()
      const content = data.content ?? ""
      store.setCurrentContent(content)
      store.setOriginalContent(content)
      if (path.endsWith(".typ")) doCompile()
    } catch (err) {
      console.error("Failed to load file:", err)
    }
  }

  async function loadBinaryPreview(path: string) {
    const pid = store.projectId || projectId
    try {
      store.setIsCompiling(false)
      store.setPreviewPages(null)
      const res = await fetch(
        `/api/files?projectId=${encodeURIComponent(pid)}&path=${encodeURIComponent(path)}`
      )
      if (!res.ok) throw new Error("Failed to load binary")
      const blob = await res.blob()
      const prev = useEditorStore.getState().previewUrl
      const url = URL.createObjectURL(blob)
      store.setPreviewUrl(url)
      if (prev) URL.revokeObjectURL(prev)
    } catch (err) {
      console.error("Failed to load preview:", err)
    }
  }

  const doCompile = useCallback(async () => {
    const state = useEditorStore.getState()
    if (!state.projectId || !state.currentFilePath?.endsWith(".typ")) return
    const gen = ++compileGenRef.current
    state.setIsCompiling(true)
    setCompileError("")
    setFontWarning("")
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: state.projectId,
          entry: state.currentFilePath,
          path: state.currentFilePath,
          content: state.currentContent,
          format: "preview",
        }),
      })
      if (gen !== compileGenRef.current) return
      if (!res.ok) {
        const err = await res.json()
        let msg = err.error || "Compile failed"
        if (err.fontDebug) {
          msg += `\n\n[fonts] staged=${err.fontDebug.staged} files=${err.fontDebug.files?.length ?? 0}`
          if (err.fontDebug.lfsPointers?.length) {
            msg += `\nLFS pointers (not real fonts): ${err.fontDebug.lfsPointers.join(", ")}`
          }
        }
        setCompileError(msg)
        return
      }
      const data = await res.json()
      if (gen !== compileGenRef.current) return
      const pages: string[] = data.pages || []
      if (pages.length === 0) {
        setCompileError("Preview produced no pages")
        return
      }
      const s = useEditorStore.getState()
      s.setPreviewPages(pages)
      s.setPreviewType("typst")
      if (s.previewUrl) {
        URL.revokeObjectURL(s.previewUrl)
        s.setPreviewUrl(null)
      }

      // Warn when CJK text is present but no project fonts were staged
      const fd = data.fontDebug
      if (fd) {
        const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(state.currentContent)
        const requested = [
          ...state.currentContent.matchAll(/font:\s*"([^"]+)"/g),
          ...state.currentContent.matchAll(/font:\s*\(([^)]+)\)/g),
        ]
        const names = requested
          .flatMap((m) => m[1].split(",").map((x: string) => x.replace(/["'\s]/g, "")))
          .filter(Boolean)
        const families: string[] = fd.families || []
        const missing = names.filter(
          (n: string) =>
            n &&
            !families.some((f) => f.toLowerCase() === n.toLowerCase())
        )
        if (fd.lfsPointers?.length) {
          setFontWarning(
            `Font files are Git LFS pointers (not real fonts): ${fd.lfsPointers.join(", ")}. Upload .ttf/.otf into fonts/ or pull with LFS.`
          )
        } else if (fd.staged === 0 && hasCjk) {
          setFontWarning(
            "No font files found in this project. Chinese will show as □. Put .ttf/.otf/.ttc into fonts/ (family name must match #set text)."
          )
        } else if (missing.length > 0 && hasCjk) {
          setFontWarning(
            `Requested font(s) not found by Typst: ${missing.join(", ")}. Loaded ${fd.staged} file(s). Open Fonts to see available family names.`
          )
        }
      }
    } catch (err) {
      if (gen === compileGenRef.current) {
        setCompileError("Compile request failed")
        console.error("Compile failed:", err)
      }
    } finally {
      if (gen === compileGenRef.current) {
        useEditorStore.getState().setIsCompiling(false)
      }
    }
  }, [])

  const exportFile = useCallback(async (format: "pdf" | "png" | "svg") => {
    const state = useEditorStore.getState()
    if (!state.projectId || !state.currentFilePath?.endsWith(".typ")) return
    state.setIsCompiling(true)
    setCompileError("")
    setShowExportMenu(false)
    try {
      const baseName =
        state.currentFilePath.split("/").pop()?.replace(/\.typ$/, "") || "output"
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: state.projectId,
          entry: state.currentFilePath,
          path: state.currentFilePath,
          content: state.currentContent,
          format,
          filename: `${baseName}.${format === "png" ? "zip" : format}`,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setCompileError(err.error || `Export ${format.toUpperCase()} failed`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = format === "png" ? "zip" : format
      a.download = `${baseName}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setCompileError(`Export ${format.toUpperCase()} request failed`)
      console.error(`Export ${format} failed:`, err)
    } finally {
      state.setIsCompiling(false)
    }
  }, [])

  async function fetchFonts() {
    if (!store.projectId) return
    setLoadingFonts(true)
    setShowFonts(true)
    setFontError("")
    try {
      const res = await fetch(
        `/api/fonts?projectId=${encodeURIComponent(store.projectId)}`
      )
      if (!res.ok) {
        const err = await res.json()
        setFontError(err.error || "Failed to list fonts")
        return
      }
      const data = await res.json()
      setFontList(data.fonts || [])
      setFontFiles(data.files || [])
      setFontLfs(data.lfsPointers || [])
    } catch (err) {
      setFontError("Network error listing fonts")
    } finally {
      setLoadingFonts(false)
    }
  }

  async function openBindDialog() {
    setShowBind(true)
    setShowGitMenu(false)
    try {
      const res = await fetch("/api/github/repos")
      if (res.ok) setBindRepos(await res.json())
    } catch {
      setBindRepos([])
    }
  }

  async function bindRepo(fullName: string) {
    const [owner, repo] = fullName.split("/")
    if (!owner || !repo || !store.projectId) return
    setGitBusy(true)
    try {
      const res = await fetch(`/api/projects/${store.projectId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bind", owner, repo }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Bind failed")
        return
      }
      const meta = await res.json()
      store.setProject(meta)
      setShowBind(false)
    } catch (e: any) {
      alert(e.message || "Bind failed")
    } finally {
      setGitBusy(false)
    }
  }

  async function unbindGit() {
    if (!store.projectId) return
    if (!confirm("Unbind GitHub? Local files are kept; only the remote link is removed.")) return
    setGitBusy(true)
    try {
      const res = await fetch(`/api/projects/${store.projectId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unbind" }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Unbind failed")
        return
      }
      const meta = await res.json()
      store.setProject(meta)
    } finally {
      setGitBusy(false)
      setShowGitMenu(false)
    }
  }

  async function pullFromGit() {
    if (!store.projectId || !store.git) return
    if (
      !confirm(
        "Pull from GitHub? Remote files will overwrite local files with the same path."
      )
    )
      return
    setGitBusy(true)
    try {
      const res = await fetch(`/api/projects/${store.projectId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull" }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Pull failed")
        return
      }
      store.refreshFiles()
      if (store.currentFilePath) await loadFile(store.currentFilePath)
    } finally {
      setGitBusy(false)
      setShowGitMenu(false)
    }
  }

  async function pushToGit() {
    if (!store.projectId || !store.git) return
    // Save current buffer first
    if (store.currentContent !== store.originalContent) {
      await doLocalSave()
    }
    setGitBusy(true)
    try {
      const res = await fetch(`/api/projects/${store.projectId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push",
          message: commitMsg.trim() || `Update from Typst Forge`,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Push failed")
        return
      }
      setShowCommit(false)
      setCommitMsg("")
      setShowGitMenu(false)
      alert("Pushed to GitHub successfully.")
    } catch (e: any) {
      alert(e.message || "Push failed")
    } finally {
      setGitBusy(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false)
      }
      if (gitMenuRef.current && !gitMenuRef.current.contains(event.target as Node)) {
        setShowGitMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const ext = store.currentFilePath?.split(".").pop()?.toLowerCase() || ""
  const isTypst = store.currentFilePath?.endsWith(".typ")
  const isTextFile = !BINARY_EXT.has(ext)
  const showEditor = isTextFile && store.currentFilePath
  const dirty = store.currentContent !== store.originalContent

  function panelFiles() {
    const tabs = [
      { id: "files" as const, icon: FolderTree, label: "Files" },
      { id: "search" as const, icon: Search, label: "Search" },
      { id: "symbols" as const, icon: Grid3X3, label: "Symbols" },
    ]
    return (
      <div className="h-full flex flex-col bg-bg-secondary">
        <div className="flex items-center border-b border-border-secondary">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = leftTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setLeftTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
                  active
                    ? "text-accent bg-accent/5 border-b border-accent"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <Icon size={11} />
                {t.label}
              </button>
            )
          })}
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          {leftTab === "files" && <FileTree />}
          {leftTab === "search" && <CodebaseSearch />}
          {leftTab === "symbols" && (
            <TypstSymbols
              onInsert={(text) => codeEditorRef.current?.insertText(text)}
            />
          )}
        </div>
      </div>
    )
  }

  function panelEditor() {
    return (
      <div className="h-full flex flex-col bg-bg-primary">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-secondary">
          <div className="flex items-center gap-2">
            <Code size={13} className="text-text-tertiary" />
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Editor
            </span>
          </div>
          {isTypst && (
            <span className="text-[10px] text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded">
              Typst
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {store.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-accent" />
            </div>
          ) : (
            <CodeEditor ref={codeEditorRef} />
          )}
        </div>
      </div>
    )
  }

  function panelBinary() {
    return (
      <div className="h-full flex flex-col bg-bg-secondary items-center justify-center">
        <FileText size={24} className="text-text-tertiary/40 mb-2" />
        <p className="text-xs text-text-tertiary">Binary file — no editor</p>
      </div>
    )
  }

  function panelPreview() {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-secondary bg-bg-secondary">
          <div className="flex items-center gap-2">
            <Eye size={13} className="text-text-tertiary" />
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Preview
            </span>
          </div>
          {store.isCompiling && (
            <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <Loader2 size={10} className="animate-spin" />
              Compiling…
            </span>
          )}
        </div>
        {compileError && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-3 py-2 max-h-48 overflow-y-auto shrink-0 flex items-start gap-2">
            <pre className="flex-1 text-[11px] text-red-300 leading-relaxed whitespace-pre-wrap break-all">
              {compileError}
            </pre>
            <button
              onClick={() => setCompileError("")}
              className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors shrink-0 mt-0.5"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {fontWarning && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 shrink-0 flex items-start gap-2">
            <p className="flex-1 text-[11px] text-amber-200 leading-relaxed">
              {fontWarning}{" "}
              <button
                onClick={fetchFonts}
                className="underline text-accent hover:text-accent-hover"
              >
                Open Fonts
              </button>
            </p>
            <button
              onClick={() => setFontWarning("")}
              className="p-0.5 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel />
        </div>
      </div>
    )
  }

  const filteredBind = bindRepos.filter(
    (r) =>
      r.name.toLowerCase().includes(bindSearch.toLowerCase()) ||
      r.full_name.toLowerCase().includes(bindSearch.toLowerCase())
  )

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <header className="flex items-center justify-between px-4 h-12 border-b border-border-secondary bg-bg-secondary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/projects")}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-4 bg-border-secondary" />
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-accent shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {store.projectName || "…"}
            </span>
          </div>
          {store.currentFilePath && (
            <>
              <span className="text-text-tertiary text-xs">/</span>
              <span className="text-xs text-text-secondary truncate max-w-[200px]">
                {store.currentFilePath}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-text-tertiary whitespace-nowrap">
            {store.isSaving ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Saving…
              </>
            ) : dirty ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Unsaved
              </>
            ) : (
              <>
                <Check size={11} className="text-text-tertiary/60" />
                Saved locally
              </>
            )}
          </span>

          {/* Git optional menu */}
          <div className="relative" ref={gitMenuRef}>
            <button
              onClick={() => setShowGitMenu((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-all",
                store.git
                  ? "text-text-primary border-accent/40 bg-accent/10 hover:bg-accent/15"
                  : "text-text-secondary border-border-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              <GitBranch size={13} />
              {store.git ? `${store.git.owner}/${store.git.repo}` : "Git"}
              <ChevronDown size={12} />
            </button>
            {showGitMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-bg-elevated border border-border-primary rounded-lg shadow-xl overflow-hidden z-50">
                {!store.git ? (
                  <button
                    onClick={openBindDialog}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover text-left"
                  >
                    <Link2 size={13} className="text-accent" />
                    Bind GitHub repo…
                  </button>
                ) : (
                  <>
                    <div className="px-3 py-2 text-[10px] text-text-tertiary border-b border-border-secondary">
                      Bound · manual commit only
                    </div>
                    <button
                      onClick={() => {
                        setShowCommit(true)
                        setShowGitMenu(false)
                      }}
                      disabled={gitBusy}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover text-left"
                    >
                      <CloudUpload size={13} className="text-accent" />
                      Commit &amp; push…
                    </button>
                    <button
                      onClick={pullFromGit}
                      disabled={gitBusy}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover text-left"
                    >
                      <Download size={13} />
                      Pull from GitHub
                    </button>
                    {store.git.htmlUrl && (
                      <a
                        href={store.git.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover text-left"
                      >
                        <GitBranch size={13} />
                        Open on GitHub
                      </a>
                    )}
                    <div className="h-px bg-border-secondary mx-2" />
                    <button
                      onClick={unbindGit}
                      disabled={gitBusy}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400/90 hover:bg-bg-hover text-left"
                    >
                      <Unlink size={13} />
                      Unbind
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {isTypst && (
            <button
              onClick={fetchFonts}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-secondary rounded-md transition-all"
            >
              <Type size={13} />
              Fonts
            </button>
          )}
          {isTypst && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                disabled={store.isCompiling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-black rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {store.isCompiling ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Play size={13} />
                )}
                Compile
                <ChevronDown
                  size={13}
                  className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-bg-elevated border border-border-primary rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      doCompile()
                      setShowExportMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <Play size={13} className="text-accent" />
                    Preview
                  </button>
                  <div className="h-px bg-border-secondary mx-2" />
                  <button
                    onClick={() => exportFile("pdf")}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <FileText size={13} className="text-text-tertiary" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => exportFile("png")}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <FileImage size={13} className="text-text-tertiary" />
                    Export PNG
                  </button>
                  <button
                    onClick={() => exportFile("svg")}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <Download size={13} className="text-text-tertiary" />
                    Export SVG
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showFonts && (
        <div className="relative z-50">
          <div className="absolute right-4 top-0 w-96 max-h-[28rem] bg-bg-elevated border border-border-primary rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Project Fonts
              </span>
              <button
                onClick={() => setShowFonts(false)}
                className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[24rem]">
              {loadingFonts ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={16} className="animate-spin text-accent" />
                </div>
              ) : fontError ? (
                <p className="text-xs text-red-400 text-center py-4 px-3 break-words">
                  {fontError}
                </p>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-border-secondary text-[10px] text-text-tertiary space-y-1">
                    <p>
                      Files on disk:{" "}
                      <span className="text-text-secondary">{fontFiles.length}</span>
                      {" · "}
                      Families Typst sees:{" "}
                      <span className="text-text-secondary">{fontList.length}</span>
                    </p>
                    <p>
                      Use exact family name in{" "}
                      <code className="text-accent">#set text(font: &quot;…&quot;)</code>
                    </p>
                    {fontLfs.length > 0 && (
                      <p className="text-amber-400">
                        LFS pointers (not usable): {fontLfs.join(", ")}
                      </p>
                    )}
                    {fontFiles.length === 0 && (
                      <p className="text-amber-400">
                        No .ttf/.otf/.ttc found. Upload into fonts/ — Docker has no Windows fonts like PMingLiU.
                      </p>
                    )}
                  </div>
                  {fontFiles.length > 0 && (
                    <div className="px-3 py-2 border-b border-border-secondary">
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                        Files
                      </p>
                      <ul className="space-y-0.5">
                        {fontFiles.map((f) => (
                          <li
                            key={f.path}
                            className="text-[11px] font-mono text-text-secondary truncate"
                          >
                            {f.path}{" "}
                            <span className="text-text-tertiary">
                              ({f.isLfsPointer ? "LFS!" : `${Math.round(f.size / 1024)}KB`})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {fontList.length === 0 ? (
                    <p className="text-xs text-text-tertiary text-center py-6 px-3">
                      Typst found no families. Check files above.
                    </p>
                  ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-tertiary border-b border-border-secondary">
                      <th className="text-left px-3 py-1.5 font-medium">Family</th>
                      <th className="text-left px-3 py-1.5 font-medium">Styles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fontList.map((f, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-secondary/50 last:border-0"
                      >
                        <td className="px-3 py-1.5 text-text-primary font-mono">
                          {f.family}
                        </td>
                        <td className="px-3 py-1.5 text-text-tertiary">
                          {f.styles || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bind GitHub dialog */}
      {showBind && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
          onClick={() => setShowBind(false)}
        >
          <div
            className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">
                Bind GitHub repository
              </h2>
              <button
                onClick={() => setShowBind(false)}
                className="p-1 rounded text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-tertiary mb-3">
              Optional. Local files stay the source of truth. After binding you can
              manually commit &amp; push.
            </p>
            <input
              value={bindSearch}
              onChange={(e) => setBindSearch(e.target.value)}
              placeholder="Search repos…"
              className="w-full px-3 py-2 mb-3 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary outline-none focus:border-accent/50"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredBind.length === 0 ? (
                <p className="text-xs text-text-tertiary text-center py-6">
                  No repositories found
                </p>
              ) : (
                filteredBind.map((r) => (
                  <button
                    key={r.id}
                    disabled={gitBusy}
                    onClick={() => bindRepo(r.full_name)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-text-tertiary ml-2">
                      {r.full_name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Commit message dialog */}
      {showCommit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
          onClick={() => setShowCommit(false)}
        >
          <div
            className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">
                Commit &amp; push
              </h2>
              <button
                onClick={() => setShowCommit(false)}
                className="p-1 rounded text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-tertiary mb-3">
              Pushes the entire local project to{" "}
              <span className="text-accent">
                {store.git?.owner}/{store.git?.repo}
              </span>
              . This is manual — nothing is auto-committed.
            </p>
            <input
              autoFocus
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Commit message"
              className="w-full px-3 py-2 mb-4 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary outline-none focus:border-accent/50"
            />
            <div className="flex gap-2">
              <button
                onClick={pushToGit}
                disabled={gitBusy}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-black rounded-lg hover:bg-accent-hover disabled:opacity-40"
              >
                {gitBusy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Push
              </button>
              <button
                onClick={() => setShowCommit(false)}
                className="px-4 py-2 text-sm text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="hidden md:flex h-full">
          <ResizablePanelGroup
            minSizes={[10, 20, 15]}
            maxSizes={[45, 60, 60]}
            initialSizes={[16, 44, 40]}
          >
            {panelFiles()}
            {showEditor ? panelEditor() : panelBinary()}
            {panelPreview()}
          </ResizablePanelGroup>
        </div>

        <div className="flex md:hidden flex-col h-full">
          <div className="flex-1 overflow-hidden">
            {mobilePanel === "files" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border-secondary bg-bg-secondary">
                  <FolderTree size={13} className="text-text-tertiary" />
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Files
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FileTree />
                </div>
              </div>
            )}
            {mobilePanel === "editor" &&
              (showEditor ? (
                <div className="h-full flex flex-col">{panelEditor()}</div>
              ) : (
                panelBinary()
              ))}
            {mobilePanel === "preview" && (
              <div className="h-full flex flex-col">{panelPreview()}</div>
            )}
          </div>
          <div className="flex items-center border-t border-border-secondary bg-bg-secondary shrink-0">
            {(["files", "editor", "preview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobilePanel(tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-wider transition-colors ${
                  mobilePanel === tab ? "text-accent" : "text-text-tertiary"
                }`}
              >
                {tab === "files" ? (
                  <FolderTree size={14} />
                ) : tab === "editor" ? (
                  <Code size={14} />
                ) : (
                  <Eye size={14} />
                )}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function findFirstFile(
  files: { type: string; name: string; path: string; children?: any[] }[],
  ext: string
): { path: string } | null {
  for (const f of files) {
    if (f.type === "file" && f.name.endsWith(ext)) return f
    if (f.children) {
      const r = findFirstFile(f.children, ext)
      if (r) return r
    }
  }
  return null
}

export default function EditorClient({ projectId }: { projectId: string }) {
  return (
    <AuthGuard>
      <EditorContent projectId={projectId} />
    </AuthGuard>
  )
}
