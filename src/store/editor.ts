"use client"

import { create } from "zustand"
import type { GitBinding, LocalProject, ProjectFile } from "@/types"

export type PreviewType = "typst" | "pdf" | "image" | "none"

/** Editor→preview scroll-sync payload (line + scroll ratio 0–1). */
export interface EditorSyncPos {
  line: number
  totalLines: number
  scrollRatio: number
  seq: number
}

/** Preview→editor jump request */
export interface JumpToSource {
  line: number
  ratio: number
  seq: number
}

interface EditorStore {
  projectId: string | null
  projectName: string
  projectMeta: LocalProject | null
  git: GitBinding | null
  files: ProjectFile[]
  currentFilePath: string | null
  currentContent: string
  originalContent: string
  previewUrl: string | null
  previewPages: string[] | null
  previewType: PreviewType
  isCompiling: boolean
  isLoading: boolean
  isSaving: boolean
  lastSavedAt: string | null
  refreshTrigger: number
  expandedPaths: Set<string>
  scrollSyncEnabled: boolean
  editorSync: EditorSyncPos | null
  jumpToSource: JumpToSource | null

  setProject: (meta: LocalProject) => void
  setFiles: (files: ProjectFile[]) => void
  setCurrentFile: (path: string | null) => void
  setCurrentContent: (content: string) => void
  setOriginalContent: (content: string) => void
  setPreviewUrl: (url: string | null) => void
  setPreviewPages: (pages: string[] | null) => void
  setPreviewType: (t: PreviewType) => void
  setIsCompiling: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  setIsSaving: (v: boolean) => void
  setLastSavedAt: (iso: string | null) => void
  setScrollSyncEnabled: (v: boolean) => void
  setEditorSync: (pos: Omit<EditorSyncPos, "seq">) => void
  requestJumpToSource: (line: number, ratio: number) => void
  clearJumpToSource: () => void
  setGit: (git: GitBinding | null) => void
  refreshFiles: () => void
  toggleExpanded: (path: string) => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  projectId: null,
  projectName: "",
  projectMeta: null,
  git: null,
  files: [],
  currentFilePath: null,
  currentContent: "",
  originalContent: "",
  previewUrl: null,
  previewPages: null,
  previewType: "none",
  isCompiling: false,
  isLoading: true,
  isSaving: false,
  lastSavedAt: null,
  refreshTrigger: 0,
  expandedPaths: new Set<string>(),
  scrollSyncEnabled: true,
  editorSync: null,
  jumpToSource: null,

  setProject: (meta) =>
    set({
      projectId: meta.id,
      projectName: meta.name,
      projectMeta: meta,
      git: meta.git ?? null,
    }),
  setFiles: (files) => set({ files, isLoading: false }),
  setCurrentFile: (path) => set({ currentFilePath: path, editorSync: null }),
  setCurrentContent: (content) => set({ currentContent: content }),
  setOriginalContent: (content) => set({ originalContent: content }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setPreviewPages: (pages) => set({ previewPages: pages }),
  setPreviewType: (t) => set({ previewType: t }),
  setIsCompiling: (v) => set({ isCompiling: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setIsSaving: (v) => set({ isSaving: v }),
  setLastSavedAt: (iso) => set({ lastSavedAt: iso }),
  setScrollSyncEnabled: (v) => set({ scrollSyncEnabled: v }),
  setEditorSync: (pos) =>
    set((s) => ({
      editorSync: { ...pos, seq: (s.editorSync?.seq ?? 0) + 1 },
    })),
  requestJumpToSource: (line, ratio) =>
    set((s) => ({
      jumpToSource: {
        line,
        ratio,
        seq: (s.jumpToSource?.seq ?? 0) + 1,
      },
    })),
  clearJumpToSource: () => set({ jumpToSource: null }),
  setGit: (git) =>
    set((s) => ({
      git,
      projectMeta: s.projectMeta ? { ...s.projectMeta, git } : s.projectMeta,
    })),
  refreshFiles: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
  toggleExpanded: (path) =>
    set((state) => {
      const next = new Set(state.expandedPaths)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { expandedPaths: next }
    }),
}))
