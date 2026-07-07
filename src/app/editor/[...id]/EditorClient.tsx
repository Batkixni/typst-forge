"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEditorStore } from "@/store/editor"
import { getFileTree, getFileContent, getFileBlob } from "@/lib/github"
import FileTree from "@/components/FileTree"
import CodeEditor from "@/components/CodeEditor"
import PreviewPanel from "@/components/PreviewPanel"
import AuthGuard from "@/components/AuthGuard"
import { ResizablePanelGroup } from "@/components/ResizablePanels"
import {
  Loader2,
  ArrowLeft,
  Play,
  FileText,
  FolderTree,
  Eye,
  Code,
  Check,
  File,
  PanelLeft,
} from "lucide-react"

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp"])
const BINARY_EXT = new Set(["pdf", ...IMAGE_EXT])
const DRAFT_KEY = "typst-forge-draft"

function saveDraft(path: string, content: string) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ path, content, ts: Date.now() })) } catch {}
}

function loadDraft(path: string): { content: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (d.path === path) return d
  } catch {}
  return null
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

function EditorContent({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const store = useEditorStore()
  const compileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingVersionRef = useRef(0)
  const [ownerName, repoName] = projectId.split("/")
  const [mobilePanel, setMobilePanel] = useState<"files" | "editor" | "preview">("editor")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (!ownerName || !repoName) { router.push("/projects"); return }
    store.setProjectMeta({ projectId, owner: ownerName, repo: repoName, branch: "main" })
  }, [projectId])

  useEffect(() => {
    if (!session?.accessToken || !ownerName || !repoName) return
    ;(async () => {
      try {
        const tree = await getFileTree(session.accessToken!, ownerName, repoName)
        store.setFiles(tree)

        const first = findFirstFile(tree, ".typ")
        if (first) {
          store.setCurrentFile(first.path)
          // file-switching effect handles loadFile + compile
        }
      } catch (err) {
        console.error("Failed to load project:", err)
      }
    })()
  }, [session?.accessToken, ownerName, repoName, store.refreshTrigger])

  // File switching — watch currentFilePath
  useEffect(() => {
    if (!store.currentFilePath) return

    const ext = store.currentFilePath.split(".").pop()?.toLowerCase() || ""

    if (BINARY_EXT.has(ext)) {
      store.setPreviewType(ext === "pdf" ? "pdf" : "image")
      loadBinaryPreview(store.currentFilePath)
      store.setCurrentContent("")
      store.setOriginalContent("")
    } else {
      loadFile(store.currentFilePath)
    }
  }, [store.currentFilePath])

  // Auto-compile on content change
  useEffect(() => {
    if (!store.currentFilePath?.endsWith(".typ") || !store.currentContent) return
    if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current)
    compileTimeoutRef.current = setTimeout(() => doCompile(), 1500)
    return () => { if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current) }
  }, [store.currentContent, store.currentFilePath])

  // Auto-save on content change — local immediately, GitHub with debounce
  useEffect(() => {
    if (!store.currentFilePath || store.currentContent === store.originalContent) return
    const isBinary = BINARY_EXT.has(store.currentFilePath.split(".").pop()?.toLowerCase() || "")
    if (isBinary) return
    saveDraft(store.currentFilePath, store.currentContent)
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => doSave(), 2000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [store.currentContent, store.currentFilePath, store.currentContent !== store.originalContent])

  async function doSave() {
    const state = useEditorStore.getState()
    if (!state.owner || !state.repo) return
    const textChanged = state.currentFilePath && state.currentContent !== state.originalContent
    const hasUploads = state.pendingUploads.length > 0
    if (!textChanged && !hasUploads) return
    const version = ++savingVersionRef.current
    store.setIsSaving(true)
    try {
      const body: Record<string, any> = {
        owner: state.owner,
        repo: state.repo,
      }
      if (textChanged) {
        body.path = state.currentFilePath
        body.content = state.currentContent
        body.message = `Update ${state.currentFilePath}`
      }
      if (hasUploads) {
        body.uploads = state.pendingUploads.map((u) => u.path)
        body.message = body.message || `Add ${state.pendingUploads.length} file(s)`
      }
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); console.error("Save error:", err.error); return }
      if (version === savingVersionRef.current) {
        if (textChanged) {
          store.setOriginalContent(state.currentContent)
          clearDraft()
        }
        store.clearPendingUploads()
        store.refreshFiles()
      }
    } catch (err) {
      console.error("Save failed:", err)
    } finally {
      store.setIsSaving(false)
    }
  }

  async function loadFile(path: string) {
    if (!session?.accessToken || !ownerName || !repoName) return
    try {
      store.setIsCompiling(false)
      store.setPreviewUrl(null)
      store.setPreviewType("none")
      const content = await getFileContent(session.accessToken, ownerName, repoName, path)
      const draft = loadDraft(path)
      const restored = draft ? draft.content : null
      const useContent = restored ?? content
      store.setCurrentContent(useContent)
      store.setOriginalContent(restored ? content : useContent)

      if (path.endsWith(".typ")) doCompile()
    } catch (err) {
      console.error("Failed to load file:", err)
    }
  }

  async function loadBinaryPreview(path: string) {
    if (!session?.accessToken || !ownerName || !repoName) return
    try {
      store.setIsCompiling(false)
      const blob = await getFileBlob(session.accessToken, ownerName, repoName, path)
      const url = URL.createObjectURL(blob)
      store.setPreviewUrl(url)
    } catch (err) {
      console.error("Failed to load preview:", err)
    }
  }

  const doCompile = useCallback(async () => {
    const state = useEditorStore.getState()
    if (!state.currentFilePath?.endsWith(".typ")) return
    state.setIsCompiling(true)
    try {
      const { currentContent, owner, repo } = useEditorStore.getState()
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent, owner, repo }),
      })
      if (!res.ok) { const err = await res.json(); console.error("Compile error:", err.error); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      useEditorStore.getState().setPreviewUrl(url)
      useEditorStore.getState().setPreviewType("typst")
    } catch (err) {
      console.error("Compile failed:", err)
    } finally {
      useEditorStore.getState().setIsCompiling(false)
    }
  }, [])

  const ext = store.currentFilePath?.split(".").pop()?.toLowerCase() || ""
  const isTypst = store.currentFilePath?.endsWith(".typ")
  const isTextFile = !BINARY_EXT.has(ext)
  const showEditor = isTextFile && store.currentFilePath

  function panelFiles() {
    return (
      <div className="h-full flex flex-col bg-bg-secondary">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-secondary">
          <FolderTree size={13} className="text-text-tertiary" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Files</span>
        </div>
        <div className="flex-1 overflow-y-auto"><FileTree /></div>
      </div>
    )
  }

  function panelEditor() {
    return (
      <div className="h-full flex flex-col bg-bg-primary">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-secondary">
          <div className="flex items-center gap-2">
            <Code size={13} className="text-text-tertiary" />
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Editor</span>
          </div>
          {isTypst && <span className="text-[10px] text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded">Typst</span>}
        </div>
        <div className="flex-1 overflow-hidden">
          {store.isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-accent" /></div>
          ) : <CodeEditor />}
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
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Preview</span>
          </div>
          {store.isCompiling && <span className="flex items-center gap-1 text-[10px] text-text-tertiary"><Loader2 size={10} className="animate-spin" />Compiling…</span>}
        </div>
        <div className="flex-1 overflow-hidden"><PreviewPanel /></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <header className="flex items-center justify-between px-4 h-12 border-b border-border-secondary bg-bg-secondary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/projects")} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-4 bg-border-secondary" />
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-accent" />
            <span className="text-sm font-medium text-text-primary">{repoName || "…"}</span>
          </div>
          {store.currentFilePath && (
            <>
              <span className="text-text-tertiary text-xs">/</span>
              <span className="text-xs text-text-secondary truncate max-w-[200px]">{store.currentFilePath}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-text-tertiary whitespace-nowrap">
            {store.isSaving ? (
              <><Loader2 size={11} className="animate-spin" />Saving…</>
            ) : store.pendingUploads.length > 0 ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-accent" />{store.pendingUploads.length} file{store.pendingUploads.length > 1 ? "s" : ""} pending</>
            ) : store.currentContent !== store.originalContent ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-accent" />Unsaved</>
            ) : (
              <><Check size={11} className="text-text-tertiary/60" />Saved</>
            )}
          </span>
          {(store.currentContent !== store.originalContent || store.pendingUploads.length > 0) && (
            <button onClick={doSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bg-elevated text-text-primary rounded-md hover:bg-bg-hover border border-border-secondary transition-all">
              Save{store.pendingUploads.length > 0 ? ` (${store.pendingUploads.length} file${store.pendingUploads.length > 1 ? "s" : ""})` : ""}
            </button>
          )}
          {isTypst && (
            <button onClick={doCompile} disabled={store.isCompiling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-black rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {store.isCompiling ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Compile
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {/* Desktop: side-by-side panels */}
        <div className="hidden md:flex h-full">
          <ResizablePanelGroup minSizes={[10, 20, 15]} maxSizes={[45, 60, 60]} initialSizes={[16, 44, 40]}>
            {panelFiles()}
            {showEditor ? panelEditor() : panelBinary()}
            {panelPreview()}
          </ResizablePanelGroup>
        </div>

        {/* Mobile: single panel + tab bar */}
        <div className="flex md:hidden flex-col h-full">
          <div className="flex-1 overflow-hidden">
            {mobilePanel === "files" && <div className="h-full flex flex-col"><div className="flex items-center gap-2 px-4 py-2 border-b border-border-secondary bg-bg-secondary"><FolderTree size={13} className="text-text-tertiary" /><span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Files</span></div><div className="flex-1 overflow-y-auto"><FileTree /></div></div>}
            {mobilePanel === "editor" && (showEditor ? <div className="h-full flex flex-col">{panelEditor()}</div> : panelBinary())}
            {mobilePanel === "preview" && <div className="h-full flex flex-col">{panelPreview()}</div>}
          </div>
          <div className="flex items-center border-t border-border-secondary bg-bg-secondary shrink-0">
            {(["files", "editor", "preview"] as const).map((tab) => (
              <button key={tab} onClick={() => setMobilePanel(tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-wider transition-colors ${
                  mobilePanel === tab ? "text-accent" : "text-text-tertiary"
                }`}>
                {tab === "files" ? <FolderTree size={14} /> : tab === "editor" ? <Code size={14} /> : <Eye size={14} />}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function findFirstFile(files: { type: string; name: string; path: string; children?: any[] }[], ext: string): { path: string } | null {
  for (const f of files) {
    if (f.type === "file" && f.name.endsWith(ext)) return f
    if (f.children) { const r = findFirstFile(f.children, ext); if (r) return r }
  }
  return null
}

export default function EditorClient({ projectId }: { projectId: string }) {
  return <AuthGuard><EditorContent projectId={projectId} /></AuthGuard>
}
