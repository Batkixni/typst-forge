import { StreamLanguage } from "@codemirror/language"
import { type StreamParser } from "@codemirror/language"

const keywords = new Set([
  "let", "set", "show", "if", "else", "for", "in", "while",
  "return", "break", "continue", "import", "include", "as",
  "none", "auto", "true", "false",
])

const builtin = new Set([
  "text", "align", "pad", "box", "block", "grid", "stack",
  "columns", "table", "list", "enum", "terms", "figure",
  "heading", "par", "parbreak", "pagebreak", "v", "h",
  "linebreak", "link", "url", "image", "raw", "math",
  "cite", "bibliography", "ref", "label", "outline",
  "metadata", "counter", "state", "loc", "here", "context",
  "style", "measure", "layout", "page", "place", "move",
  "rotate", "scale", "skew", "reflect", "transparente",
  "stroke", "fill", "gradient", "color", "rgb", "hsv",
  "luma", "glow", "shadow", "blur", "highlight",
  "quote", "emoji", "sym", "note", "footnote",
  "table", "table.cell", "table.header", "table.footer",
  "grid.cell", "grid.header", "grid.footer",
  "enum.start", "enum.numbering",
  "list.indent", "list.spacing",
  "text.font", "text.size", "text.weight", "text.style",
  "set", "show", "page", "columns",
])

const typstParser: StreamParser<unknown> = {
  token(stream) {
    if (stream.eatSpace()) return null

    // Line comments
    if (stream.match("//")) { stream.skipToEnd(); return "comment" }

    // Block comments
    if (stream.match("/*")) {
      let depth = 1
      while (depth > 0 && !stream.eol()) {
        if (stream.match("/*")) depth++
        else if (stream.match("*/")) depth--
        else stream.next()
      }
      return "comment"
    }

    // Raw code blocks (```...```)
    if (stream.match("```")) {
      while (!stream.eol()) {
        if (stream.match("```")) break
        stream.next()
      }
      return "raw"
    }

    // Inline code
    if (stream.match("`")) {
      while (!stream.eol()) {
        if (stream.match("`")) break
        if (stream.next() == "\\") stream.next()
      }
      return "raw"
    }

    // Math mode $$...$$ and $...$
    if (stream.match("$$")) {
      while (!stream.eol()) {
        if (stream.match("$$")) break
        stream.next()
      }
      return "math"
    }
    if (stream.match("$")) {
      while (!stream.eol()) {
        if (stream.match("$")) break
        if (stream.next() == "\\") stream.next()
      }
      return "math"
    }

    // Strings (double quotes)
    if (stream.match('"')) {
      while (!stream.eol()) {
        const ch = stream.next()
        if (ch === "\\") { stream.next() }
        else if (ch === '"') break
      }
      return "string"
    }

    // Label / reference
    if (stream.match(/^<[^\s>]+>/)) return "labelName"
    if (stream.match(/^@[a-zA-Z_]\w*/)) return "link"

    // Headings
    if (stream.match(/^={2,5}\s/)) { stream.skipToEnd(); return "heading" }

    // List markers
    if (stream.match(/^[-+]\s/)) return "list"
    if (stream.match(/^\/\s/)) return "list"
    if (stream.match(/^\d+\.\s/)) return "list"

    // Numbers with units
    if (stream.match(/^\d+(\.\d+)?(pt|cm|mm|in|em|fr|%|deg|rad|ms|s)?/)) return "number"

    // Colors (#hex)
    if (stream.match(/^#[0-9a-fA-F]{6}\b/)) return "color"
    if (stream.match(/^#[0-9a-fA-F]{3}\b/)) return "color"

    // Directives (#keyword, #function(), #expression)
    if (stream.match("#")) {
      // #true, #false, #none, #auto
      if (stream.match(/^(true|false|none|auto)\b/)) return "keyword"
      // #let, #set, #show, etc.
      if (stream.match(/^[a-zA-Z_]\w*/)) {
        const word = stream.current().slice(1)
        if (keywords.has(word)) return "keyword"
        if (builtin.has(word)) return "builtin"
        return "function"
      }
      // #{ code block
      if (stream.match("{")) return "brace"
      // #( expr )
      if (stream.match("(")) return "paren"
      // #[ content ]
      if (stream.match("[")) return "squareBracket"
      return "operator"
    }

    // Function calls in markup
    if (stream.match(/^[a-zA-Z_]\w*(?=\s*\()/)) {
      const word = stream.current()
      if (builtin.has(word)) return "builtin"
      if (keywords.has(word)) return "keyword"
      return "function"
    }

    // Identifiers
    if (stream.match(/^[a-zA-Z_]\w*/)) {
      const word = stream.current()
      if (keywords.has(word)) return "keyword"
      if (builtin.has(word)) return "builtin"
      return "variable"
    }

    // Content blocks
    if (stream.match("[")) { stream.skipTo("]") || stream.skipToEnd(); stream.match("]"); return "bracket" }

    // Punctuation and operators
    if (stream.match(/^[+\-*\/%=<>!&|^~]/)) return "operator"
    if (stream.match(/^[;:,.]/)) return "separator"
    if (stream.match(/^[{}()\[\]]/)) return "bracket"

    // Escape sequences
    if (stream.match(/^\\([\[\]{}()#$"_/\\*]|["'])/)) return "escape"

    // Emphasis markers
    if (stream.match(/^_[a-zA-Z0-9\u4e00-\u9fff]/)) { stream.backUp(1); stream.match(/^_/); return "emphasis" }
    if (stream.match(/^\*[a-zA-Z0-9\u4e00-\u9fff]/)) { stream.backUp(1); stream.match(/^\*/); return "strong" }

    stream.next()
    return null
  },

  startState() { return {} },

  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    closeBrackets: { brackets: ["(", "[", "{", '"'] },
  },
}

export function typstLanguage() {
  return StreamLanguage.define(typstParser)
}
