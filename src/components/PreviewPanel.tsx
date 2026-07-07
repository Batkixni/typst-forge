"use client"

import { useState } from "react"
import { useEditorStore } from "@/store/editor"
import { Loader2, AlertCircle, ZoomIn, ZoomOut, FileDown, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PreviewPanel() {
  const { previewUrl, previewType, isCompiling, currentFilePath } = useEditorStore()
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const isImage = previewType === "image"
  const isPdf = previewType === "pdf" || previewType === "typst"

  const ext = currentFilePath?.split(".").pop()?.toLowerCase()
  const isPreviewableFile = ext === "pdf" || ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext || "")

  return (
    <div className="h-full flex flex-col bg-[#121216]">
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <AlertCircle size={32} className="text-red-400/60 mb-3" />
          <p className="text-sm text-text-tertiary">{error}</p>
        </div>
      )}

      {isCompiling && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Loader2 size={24} className="animate-spin text-accent" />
          <span className="text-sm text-text-tertiary">Compiling…</span>
        </div>
      )}

      {!previewUrl && !isCompiling && !error && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-3">
            {isPreviewableFile ? <FileImage size={20} className="text-text-tertiary" /> : <FileDown size={20} className="text-text-tertiary" />}
          </div>
          <p className="text-sm text-text-tertiary">
            {isPreviewableFile ? "Click to preview" : "Open a file to preview"}
          </p>
        </div>
      )}

      {previewUrl && !isCompiling && (
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col items-center py-4 gap-4 min-h-full">
            {isImage ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                onError={() => setError("Failed to load image")}
                onLoad={() => setError(null)}
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full flex-1 border-none"
                title="Preview"
                onError={() => setError("Failed to load preview") as unknown as () => void}
              />
            )}
          </div>
        </div>
      )}

      {previewUrl && !isCompiling && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-secondary bg-bg-tertiary shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-text-tertiary w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <ZoomIn size={14} />
            </button>
          </div>
          <span className="text-xs text-text-tertiary">
            {isImage ? "Image" : "PDF"}
          </span>
        </div>
      )}
    </div>
  )
}
