"use client"

import { useState, useRef } from "react"
import { Search, X, Check } from "lucide-react"
import { typstSymbols, typstSymbolCategories, searchSymbols } from "@/lib/typst-symbols"
import { cn } from "@/lib/utils"

export interface TypstSymbolsProps {
  onInsert: (text: string) => void
}

export default function TypstSymbols({ onInsert }: TypstSymbolsProps) {
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = (() => {
    let list = searchSymbols(query)
    if (activeCategory && !query) {
      list = list.filter((s) => s.category === activeCategory)
    } else if (activeCategory && query) {
      list = list.filter((s) => s.category === activeCategory)
    }
    return list
  })()

  const handleInsert = (insert: string, name: string) => {
    onInsert(insert)
    setCopied(name)
    setTimeout(() => setCopied(null), 1000)
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-secondary">
        <Search size={13} className="text-text-tertiary" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Symbols</span>
      </div>

      <div className="px-3 py-2 border-b border-border-secondary">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full bg-bg-tertiary text-text-primary text-xs pl-8 pr-7 py-1.5 rounded border border-border-secondary outline-none focus:border-accent/50"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); searchRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-border-secondary overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "shrink-0 px-2 py-0.5 text-[10px] rounded-full border transition-colors",
            activeCategory === null
              ? "bg-accent text-black border-accent"
              : "bg-bg-tertiary text-text-secondary border-border-secondary hover:text-text-primary"
          )}
        >
          All
        </button>
        {typstSymbolCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={cn(
              "shrink-0 px-2 py-0.5 text-[10px] rounded-full border transition-colors",
              activeCategory === cat
                ? "bg-accent text-black border-accent"
                : "bg-bg-tertiary text-text-secondary border-border-secondary hover:text-text-primary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-text-tertiary py-8">No symbols found</div>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            {filtered.map((s) => (
              <button
                key={`${s.name}-${s.insert}`}
                onClick={() => handleInsert(s.insert, s.name)}
                title={`${s.name} — ${s.description || s.category}`}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 p-2 rounded-md border border-border-secondary/50 bg-bg-tertiary/50 hover:bg-bg-hover hover:border-accent/30 transition-colors group",
                  copied === s.name && "border-accent/50 bg-accent/10"
                )}
              >
                <span className="text-sm font-serif leading-none text-text-primary group-hover:text-accent">
                  {s.insert.startsWith("#") ? s.insert : s.insert.length > 1 ? s.insert.slice(0, 2) : s.insert}
                </span>
                <span className="text-[9px] text-text-tertiary truncate w-full text-center">{s.name}</span>
                {copied === s.name && <Check size={10} className="text-accent absolute top-1 right-1" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border-secondary text-[10px] text-text-tertiary">
        Click a symbol to insert at cursor
      </div>
    </div>
  )
}
