"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useEditorStore } from "@/store/editor"
import {
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  FileDown,
  FileImage,
  Link2,
  Link2Off,
  MousePointerClick,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function PreviewPanel() {
  const {
    previewUrl,
    previewPages,
    previewType,
    isCompiling,
    currentFilePath,
    editorSync,
    scrollSyncEnabled,
    setScrollSyncEnabled,
    requestJumpToSource,
  } = useEditorStore()

  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastSyncSeq = useRef(0)
  const userScrollingPreview = useRef(false)
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedScrollRatio = useRef(0)
  const suppressSyncUntil = useRef(0)

  const isImage = previewType === "image"
  const isPdf = previewType === "pdf"
  const isTypstSvg = previewType === "typst" && !!previewPages?.length
  const hasPreview = isTypstSvg || !!previewUrl

  const ext = currentFilePath?.split(".").pop()?.toLowerCase()
  const isPreviewableFile =
    ext === "pdf" ||
    ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext || "")

  const onPreviewScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = Math.max(1, el.scrollHeight - el.clientHeight)
    savedScrollRatio.current = el.scrollTop / max

    userScrollingPreview.current = true
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current)
    userScrollTimer.current = setTimeout(() => {
      userScrollingPreview.current = false
    }, 400)
  }, [])

  const applyPreviewRatio = useCallback((ratio: number) => {
    const el = scrollRef.current
    if (!el) return
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    const target = Math.min(1, Math.max(0, ratio)) * max
    el.scrollTop = target
    savedScrollRatio.current = ratio
  }, [])

  // After SVG pages swap: restore reading position (or re-sync from editor)
  useEffect(() => {
    if (!isTypstSvg || !scrollRef.current) return
    requestAnimationFrame(() => {
      if (scrollSyncEnabled && editorSync && !userScrollingPreview.current) {
        const lineRatio =
          editorSync.totalLines > 1
            ? (editorSync.line - 1) / (editorSync.totalLines - 1)
            : 0
        const ratio = lineRatio * 0.75 + editorSync.scrollRatio * 0.25
        applyPreviewRatio(ratio)
      } else {
        applyPreviewRatio(savedScrollRatio.current)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPages, isTypstSvg])

  // Editor → preview scroll sync
  useEffect(() => {
    if (!scrollSyncEnabled || !editorSync || !isTypstSvg) return
    if (userScrollingPreview.current) return
    if (Date.now() < suppressSyncUntil.current) return
    if (editorSync.seq === lastSyncSeq.current) return
    lastSyncSeq.current = editorSync.seq

    const el = scrollRef.current
    if (!el) return

    const lineRatio =
      editorSync.totalLines > 1
        ? (editorSync.line - 1) / (editorSync.totalLines - 1)
        : 0
    const ratio = lineRatio * 0.75 + editorSync.scrollRatio * 0.25
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    const target = ratio * max

    if (Math.abs(el.scrollTop - target) < 12) return

    el.scrollTop = target
    savedScrollRatio.current = ratio
  }, [editorSync, scrollSyncEnabled, isTypstSvg])

  /** Click preview → jump to corresponding source line (inverse mapping) */
  const onPreviewClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isTypstSvg || !contentRef.current || !scrollRef.current) return
      // Ignore pure drag-scrolls: only treat as jump if little movement (handled by click)

      const content = contentRef.current
      const rect = content.getBoundingClientRect()
      const y = e.clientY - rect.top
      const height = content.offsetHeight || 1
      const ratio = Math.min(1, Math.max(0, y / height))

      const totalLines = editorSync?.totalLines || 1
      const line = 1 + Math.round(ratio * Math.max(0, totalLines - 1))

      // Pause editor→preview follow briefly so jump doesn't bounce back
      suppressSyncUntil.current = Date.now() + 800
      userScrollingPreview.current = true
      if (userScrollTimer.current) clearTimeout(userScrollTimer.current)
      userScrollTimer.current = setTimeout(() => {
        userScrollingPreview.current = false
      }, 800)

      requestJumpToSource(line, ratio)
    },
    [isTypstSvg, editorSync?.totalLines, requestJumpToSource]
  )

  return (
    <div className="h-full flex flex-col bg-[#121216] relative">
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <AlertCircle size={32} className="text-red-400/60 mb-3" />
          <p className="text-sm text-text-tertiary">{error}</p>
        </div>
      )}

      {isCompiling && hasPreview && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-elevated/90 border border-border-secondary text-[10px] text-text-tertiary pointer-events-none">
          <Loader2 size={10} className="animate-spin text-accent" />
          Updating…
        </div>
      )}

      {isCompiling && !hasPreview && !error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Loader2 size={24} className="animate-spin text-accent" />
          <span className="text-sm text-text-tertiary">Compiling…</span>
        </div>
      )}

      {!hasPreview && !isCompiling && !error && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-3">
            {isPreviewableFile ? (
              <FileImage size={20} className="text-text-tertiary" />
            ) : (
              <FileDown size={20} className="text-text-tertiary" />
            )}
          </div>
          <p className="text-sm text-text-tertiary">
            {isPreviewableFile ? "Click to preview" : "Open a file to preview"}
          </p>
        </div>
      )}

      {isTypstSvg && (
        <div
          ref={scrollRef}
          onScroll={onPreviewScroll}
          className="flex-1 overflow-auto relative min-h-0"
        >
          <div
            ref={contentRef}
            onClick={onPreviewClick}
            className="flex flex-col items-center py-4 gap-4 min-h-full origin-top cursor-pointer"
            style={{ zoom }}
            title="Click to jump to source"
          >
            {previewPages!.map((svg, i) => (
              <div
                key={i}
                className="bg-white shadow-lg rounded-sm overflow-hidden w-full max-w-[min(100%,720px)] [&_svg]:w-full [&_svg]:h-auto [&_svg]:block pointer-events-none"
                data-page={i + 1}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ))}
          </div>
        </div>
      )}

      {previewUrl && !isTypstSvg && (
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="flex flex-col items-center py-4 gap-4 min-h-full">
            {isImage ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                }}
                onError={() => setError("Failed to load image")}
                onLoad={() => setError(null)}
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full flex-1 border-none min-h-[calc(100vh-8rem)]"
                title="Preview"
              />
            )}
          </div>
        </div>
      )}

      {hasPreview && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-secondary bg-bg-tertiary shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-text-tertiary w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            {isTypstSvg && (
              <>
                <div className="w-px h-3 bg-border-secondary mx-1" />
                <button
                  onClick={() => setScrollSyncEnabled(!scrollSyncEnabled)}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors",
                    scrollSyncEnabled
                      ? "text-accent bg-accent/10 hover:bg-accent/15"
                      : "text-text-tertiary hover:text-text-primary hover:bg-bg-hover"
                  )}
                  title={
                    scrollSyncEnabled
                      ? "Scroll sync on — preview follows editor"
                      : "Scroll sync off"
                  }
                >
                  {scrollSyncEnabled ? <Link2 size={12} /> : <Link2Off size={12} />}
                  Sync
                </button>
                <span
                  className="hidden sm:flex items-center gap-1 text-[10px] text-text-tertiary/70"
                  title="Click anywhere in the preview to jump to the matching source line"
                >
                  <MousePointerClick size={11} />
                  Click → source
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-text-tertiary">
            {isImage
              ? "Image"
              : isTypstSvg
                ? `${previewPages!.length} page${previewPages!.length > 1 ? "s" : ""} · SVG`
                : isPdf
                  ? "PDF"
                  : "PDF"}
          </span>
        </div>
      )}
    </div>
  )
}
