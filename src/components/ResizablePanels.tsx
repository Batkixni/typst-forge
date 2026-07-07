"use client"

import { useRef, useState, useCallback, type ReactNode, type MouseEvent as ReactMouseEvent, Children } from "react"

export function ResizablePanelGroup({
  children,
  minSizes,
  maxSizes,
  initialSizes,
  className = "",
}: {
  children: ReactNode
  minSizes?: number[]
  maxSizes?: number[]
  initialSizes?: number[]
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panels = Children.toArray(children)
  const count = panels.length
  const [sizes, setSizes] = useState<number[]>(
    initialSizes ?? panels.map(() => 100 / count)
  )
  const dragRef = useRef<{ i: number; start: number; sizes: number[] } | null>(null)
  const [active, setActive] = useState(-1)

  const onDown = useCallback((i: number, e: ReactMouseEvent) => {
    e.preventDefault()
    const start = e.clientX
    dragRef.current = { i, start, sizes: [...sizes] }
    setActive(i)

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return
      const { i, start, sizes: startSizes } = dragRef.current
      const rect = containerRef.current.getBoundingClientRect()
      const delta = ((e.clientX - start) / rect.width) * 100

      const lMin = minSizes?.[i] ?? 0
      const rMin = minSizes?.[i + 1] ?? 0
      const lMax = maxSizes?.[i] ?? 100
      const rMax = maxSizes?.[i + 1] ?? 100
      const sum = startSizes[i] + startSizes[i + 1]

      let l = Math.max(lMin, Math.min(lMax, startSizes[i] + delta))
      let r = sum - l
      if (r < rMin) { r = rMin; l = sum - rMin }
      if (r > rMax) { r = rMax; l = sum - rMax }

      const next = [...startSizes]
      next[i] = l
      next[i + 1] = r
      setSizes(next)
    }

    const onUp = () => {
      dragRef.current = null
      setActive(-1)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [sizes, minSizes, maxSizes])

  const items: ReactNode[] = []
  for (let i = 0; i < count; i++) {
    items.push(
      <div key={`p-${i}`} className="flex flex-col min-w-0 overflow-hidden" style={{ flex: `${sizes[i]} 0 0` }}>
        <div className="flex-1 overflow-hidden min-w-0 min-h-0">{panels[i]}</div>
      </div>
    )
    if (i < count - 1) {
      items.push(
        <div
          key={`h-${i}`}
          onMouseDown={(e) => onDown(i, e)}
          className={`shrink-0 w-[5px] cursor-col-resize transition-colors duration-150 ${active === i ? "bg-accent/60" : "bg-border-secondary hover:bg-accent/40"}`}
        />
      )
    }
  }

  return (
    <div ref={containerRef} className={`flex flex-row h-full w-full ${className}`}>
      {items}
    </div>
  )
}
