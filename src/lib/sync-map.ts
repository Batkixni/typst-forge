/**
 * Content-aware source ↔ preview scroll mapping.
 *
 * Typst source has lots of markup (#set, #import, #let, …) that never appears
 * in the PDF/SVG. Mapping by raw line ratio makes the preview jump wrongly.
 *
 * We only count "content" lines (headings, body text, content-producing markup)
 * and map through that axis. Heading anchors improve jump accuracy when text matches.
 */

export interface ContentAnchor {
  /** 1-based source line */
  line: number
  /** Progress 0–1 among content lines only */
  contentRatio: number
  /** Optional heading / snippet text for reverse lookup */
  text?: string
  kind: "heading" | "content" | "pagebreak"
}

export interface SyncMap {
  totalSourceLines: number
  /** 1-based source lines that contribute to visual output */
  contentLines: number[]
  anchors: ContentAnchor[]
}

/** Lines that typically do NOT appear in the rendered document. */
export function isStructuralLine(raw: string): boolean {
  const t = raw.trim()
  if (!t) return true
  if (t.startsWith("//") || t.startsWith("///")) return true
  if (t.startsWith("/*") || t.startsWith("*") || t.startsWith("*/")) return true

  // Module / style / pure definitions
  if (/^#(import|include)\b/.test(t)) return true
  if (/^#set\b/.test(t)) return true
  if (/^#show\b/.test(t)) return true
  // #let foo = ... without content body on same line that looks like text
  if (/^#let\s+\w+/.test(t) && !/\[/.test(t)) return true
  // lone closers / punctuation from code blocks
  if (/^[}\])]+;?$/.test(t)) return true
  // pure code-mode braces
  if (/^#[{(]/.test(t) && !/\[/.test(t)) return true

  return false
}

export function isHeadingLine(raw: string): boolean {
  return /^=+\s+\S/.test(raw.trim())
}

export function isPagebreakLine(raw: string): boolean {
  return /#pagebreak\b/.test(raw)
}

export function headingText(raw: string): string | undefined {
  const m = raw.trim().match(/^=+\s+(.+?)(?:\s*<[^>]+>)?\s*$/)
  return m?.[1]?.trim()
}

/** Extract a short searchable snippet from a content line. */
export function contentSnippet(raw: string): string | undefined {
  const t = raw.trim()
  if (isHeadingLine(t)) return headingText(t)
  // Strip simple markup wrappers
  let s = t
    .replace(/^#\w+(\([^)]*\))?\[/, "")
    .replace(/\]$/, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim()
  // Prefer runs of letters/CJK
  const m = s.match(/[\p{L}\p{N}][\p{L}\p{N}\s.,;:'"!?-]{2,}/u)
  if (m && m[0].trim().length >= 3) return m[0].trim().slice(0, 80)
  if (s.length >= 3 && !s.startsWith("#")) return s.slice(0, 80)
  return undefined
}

export function buildSyncMap(source: string): SyncMap {
  const lines = source.split(/\r?\n/)
  const contentLines: number[] = []
  const anchors: ContentAnchor[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const raw = lines[i]
    if (isStructuralLine(raw)) continue

    contentLines.push(lineNo)
    const idx = contentLines.length - 1
    const contentRatio =
      contentLines.length <= 1 ? 0 : idx / (contentLines.length - 1)

    if (isHeadingLine(raw)) {
      anchors.push({
        line: lineNo,
        contentRatio,
        text: headingText(raw),
        kind: "heading",
      })
    } else if (isPagebreakLine(raw)) {
      anchors.push({ line: lineNo, contentRatio, kind: "pagebreak" })
    } else {
      const snip = contentSnippet(raw)
      if (snip) {
        anchors.push({
          line: lineNo,
          contentRatio,
          text: snip,
          kind: "content",
        })
      }
    }
  }

  return {
    totalSourceLines: lines.length,
    contentLines,
    anchors,
  }
}

/** Source line (1-based) → progress 0–1 on the content axis. */
export function sourceLineToContentRatio(map: SyncMap, line: number): number {
  if (map.contentLines.length === 0) {
    if (map.totalSourceLines <= 1) return 0
    return Math.min(1, Math.max(0, (line - 1) / (map.totalSourceLines - 1)))
  }
  if (map.contentLines.length === 1) return 0

  // Find nearest content line at or before `line`
  let lo = 0
  let hi = map.contentLines.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2)
    if (map.contentLines[mid] <= line) lo = mid
    else hi = mid - 1
  }
  // If cursor is before first content line, stick to 0
  if (map.contentLines[lo] > line) return 0
  return lo / (map.contentLines.length - 1)
}

/** Preview progress 0–1 → best source line (content-aware). */
export function contentRatioToSourceLine(map: SyncMap, ratio: number): number {
  const r = Math.min(1, Math.max(0, ratio))
  if (map.contentLines.length === 0) {
    if (map.totalSourceLines <= 1) return 1
    return 1 + Math.round(r * (map.totalSourceLines - 1))
  }
  if (map.contentLines.length === 1) return map.contentLines[0]
  const idx = Math.round(r * (map.contentLines.length - 1))
  return map.contentLines[idx]
}

/**
 * Given free text (e.g. from a heading click heuristic), find best source line.
 */
export function findLineByText(map: SyncMap, text: string): number | null {
  const q = text.trim().toLowerCase()
  if (q.length < 2) return null
  // Prefer headings
  for (const a of map.anchors) {
    if (a.kind === "heading" && a.text?.toLowerCase().includes(q)) return a.line
    if (a.kind === "heading" && q.includes(a.text?.toLowerCase() || "___"))
      return a.line
  }
  for (const a of map.anchors) {
    if (a.text && a.text.toLowerCase().includes(q)) return a.line
    if (a.text && q.includes(a.text.toLowerCase())) return a.line
  }
  return null
}
