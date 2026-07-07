"use client"

import { create } from "zustand"
import type { ProjectFile } from "@/types"

export type PreviewType = "typst" | "pdf" | "image" | "none"

interface EditorStore {
  projectId: string | null
  owner: string
  repo: string
  branch: string
  files: ProjectFile[]
  currentFilePath: string | null
  currentContent: string
  originalContent: string
  previewUrl: string | null
  previewType: PreviewType
  isCompiling: boolean
  isLoading: boolean
  isSaving: boolean
  refreshTrigger: number
  expandedPaths: Set<string>

  setProjectMeta: (meta: { projectId: string; owner: string; repo: string; branch: string }) => void
  setFiles: (files: ProjectFile[]) => void
  setCurrentFile: (path: string | null) => void
  setCurrentContent: (content: string) => void
  setOriginalContent: (content: string) => void
  setPreviewUrl: (url: string | null) => void
  setPreviewType: (t: PreviewType) => void
  setIsCompiling: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  setIsSaving: (v: boolean) => void
  refreshFiles: () => void
  toggleExpanded: (path: string) => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  projectId: null,
  owner: "",
  repo: "",
  branch: "main",
  files: [],
  currentFilePath: null,
  currentContent: "",
  originalContent: "",
  previewUrl: null,
  previewType: "none",
  isCompiling: false,
  isLoading: true,
  isSaving: false,
  refreshTrigger: 0,
  expandedPaths: new Set<string>(),

  setProjectMeta: (meta) => set({ projectId: meta.projectId, owner: meta.owner, repo: meta.repo, branch: meta.branch }),
  setFiles: (files) => set({ files, isLoading: false }),
  setCurrentFile: (path) => set({ currentFilePath: path }),
  setCurrentContent: (content) => set({ currentContent: content }),
  setOriginalContent: (content) => set({ originalContent: content }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setPreviewType: (t) => set({ previewType: t }),
  setIsCompiling: (v) => set({ isCompiling: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setIsSaving: (v) => set({ isSaving: v }),
  refreshFiles: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),

  toggleExpanded: (path) =>
    set((state) => {
      const next = new Set(state.expandedPaths)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { expandedPaths: next }
    }),

}))
