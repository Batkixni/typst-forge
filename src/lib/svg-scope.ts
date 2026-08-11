/**
 * Typst multi-page SVG reuses the same glyph symbol ids across pages
 * (e.g. id="gBFE09989…"). Inlining every page into one HTML document
 * makes later <symbol> defs override earlier ones → missing/wrong glyphs
 * (often looks like □ for CJK while Latin still partially works).
 *
 * PDF is fine because fonts are embedded in a single document.
 * Fix: either isolate each page (blob/img) or rewrite ids per page.
 */

/** Prefix all id / href / url(#…) references so pages can share one DOM. */
export function scopeSvgIds(svg: string, pageIndex: number): string {
  const prefix = `p${pageIndex}_`
  return svg
    .replace(/\bid="([^"]+)"/g, (_m, id: string) => `id="${prefix}${id}"`)
    .replace(/\bhref="#([^"]+)"/g, (_m, id: string) => `href="#${prefix}${id}"`)
    .replace(/\bxlink:href="#([^"]+)"/g, (_m, id: string) => `xlink:href="#${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id: string) => `url(#${prefix}${id})`)
}
