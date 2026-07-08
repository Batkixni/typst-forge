import type { Completion, CompletionContext, CompletionSource } from "@codemirror/autocomplete"

const typstKeywords: string[] = [
  "let", "set", "show", "if", "else", "while", "for", "in", "return", "import", "include", "as", "none", "auto", "true", "false",
]

const typstFunctions: { label: string; type?: string; detail: string; insertText?: string }[] = [
  { label: "#emph", detail: "emphasis", insertText: "emph[${}]" },
  { label: "#strong", detail: "bold text", insertText: "strong[${}]" },
  { label: "#underline", detail: "underline", insertText: "underline[${}]" },
  { label: "#strike", detail: "strikethrough", insertText: "strike[${}]" },
  { label: "#link", detail: "hyperlink", insertText: "link(\"${}\")" },
  { label: "#ref", detail: "reference", insertText: "ref(\"${}\")" },
  { label: "#cite", detail: "citation", insertText: "cite(\"${}\")" },
  { label: "#figure", detail: "figure environment", insertText: "figure(\n  ${},\n  caption: [${}caption],\n)" },
  { label: "#table", detail: "table environment", insertText: "table(\n  columns: (${}),\n  [], [],\n)" },
  { label: "#image", detail: "insert image", insertText: "image(\"${}\")" },
  { label: "#heading", detail: "heading", insertText: "heading[${}]" },
  { label: "#pagebreak", detail: "page break", insertText: "pagebreak()" },
  { label: "#linebreak", detail: "line break", insertText: "linebreak()" },
  { label: "#v", detail: "vertical space", insertText: "v(${}1em)" },
  { label: "#h", detail: "horizontal space", insertText: "h(${}1em)" },
  { label: "#pad", detail: "padding", insertText: "pad(${})" },
  { label: "#align", detail: "alignment", insertText: "align(${})" },
  { label: "#rect", detail: "rectangle", insertText: "rect[${}]" },
  { label: "#box", detail: "box", insertText: "box[${}]" },
  { label: "#colbreak", detail: "column break", insertText: "colbreak()" },
  { label: "#place", detail: "place content", insertText: "place(${})" },
  { label: "#stack", detail: "stack content", insertText: "stack(dir: ltr, ${})" },
  { label: "#grid", detail: "grid layout", insertText: "grid(\n  columns: (${}),\n  [], [],\n)" },
  { label: "#columns", detail: "column layout", insertText: "columns(2, ${})" },
  { label: "#lorem", detail: "lorem ipsum", insertText: "lorem(${}50)" },
  { label: "#outline", detail: "table of contents", insertText: "outline(${})" },
  { label: "#numbering", detail: "numbering pattern", insertText: "numbering(\"1.1\", ${})" },
  { label: "#state", detail: "state variable", insertText: "state(\"${}\", 0)" },
  { label: "#counter", detail: "counter", insertText: "counter(heading).update(${})" },
  { label: "#locate", detail: "locate context", insertText: "locate(loc => ${})" },
  { label: "#query", detail: "query elements", insertText: "query(heading.where(level: 1), ${})" },
  { label: "#metadata", detail: "metadata", insertText: "metadata(${})" },
  { label: "#style", detail: "style context", insertText: "style(styles => ${})" },
  { label: "#context", detail: "context block", insertText: "context { ${} }" },
  { label: "#text", detail: "text properties", insertText: "text(${})" },
  { label: "#page", detail: "page settings", insertText: "page(${})" },
  { label: "#set", detail: "set rule", insertText: "set ${}()" },
  { label: "#show", detail: "show rule", insertText: "show ${}: ${}" },
  { label: "#let", detail: "variable definition", insertText: "let ${} = ${}" },
  { label: "#fn", detail: "function definition", insertText: "#let ${}(x) = { x }" },
  { label: "#import", detail: "import module", insertText: "import \"${}\"" },
  { label: "#include", detail: "include file", insertText: "include \"${}\"" },
  { label: "#cite", detail: "citation", insertText: "cite(\"${}\")" },
  { label: "#bibliography", detail: "bibliography", insertText: "bibliography(\"${}.bib\")" },
  { label: "#label", detail: "label", insertText: "\u003clabel-${}\u003e" },
  { label: "#footnote", detail: "footnote", insertText: "footnote[${}]" },
  { label: "#math", detail: "math mode", insertText: "$${}$" },
  { label: "#equation", detail: "numbered equation", insertText: "$ ${} $ \u003c${}\u003e" },
  { label: "#frac", detail: "fraction", insertText: "frac(${}, ${})" },
  { label: "#sqrt", detail: "square root", insertText: "sqrt(${})" },
  { label: "#sum", detail: "summation", insertText: "sum_${}^{${}} ${}" },
  { label: "#prod", detail: "product", insertText: "prod_${}^{${}} ${}" },
  { label: "#integral", detail: "integral", insertText: "integral_${}^{${}} ${} dif ${}" },
  { label: "#lim", detail: "limit", insertText: "lim_${} ${}" },
  { label: "#abs", detail: "absolute value", insertText: "abs(${})" },
  { label: "#floor", detail: "floor", insertText: "floor(${})" },
  { label: "#ceil", detail: "ceiling", insertText: "ceil(${})" },
  { label: "#vec", detail: "vector accent", insertText: "vec(${})" },
  { label: "#hat", detail: "hat accent", insertText: "hat(${})" },
  { label: "#bar", detail: "bar accent", insertText: "bar(${})" },
  { label: "#dot", detail: "dot accent", insertText: "dot(${})" },
  { label: "#ddot", detail: "double dot accent", insertText: "ddot(${})" },
  { label: "#tilde", detail: "tilde accent", insertText: "tilde(${})" },
  { label: "#matrix", detail: "matrix", insertText: "mat(${})" },
  { label: "#cases", detail: "cases", insertText: "cases(${})" },
]

const typstSymbols: { label: string; detail: string; insertText: string }[] = [
  { label: "alpha", detail: "Greek alpha", insertText: "alpha" },
  { label: "beta", detail: "Greek beta", insertText: "beta" },
  { label: "gamma", detail: "Greek gamma", insertText: "gamma" },
  { label: "delta", detail: "Greek delta", insertText: "delta" },
  { label: "epsilon", detail: "Greek epsilon", insertText: "epsilon" },
  { label: "theta", detail: "Greek theta", insertText: "theta" },
  { label: "lambda", detail: "Greek lambda", insertText: "lambda" },
  { label: "mu", detail: "Greek mu", insertText: "mu" },
  { label: "pi", detail: "Greek pi", insertText: "pi" },
  { label: "sigma", detail: "Greek sigma", insertText: "sigma" },
  { label: "phi", detail: "Greek phi", insertText: "phi" },
  { label: "psi", detail: "Greek psi", insertText: "psi" },
  { label: "omega", detail: "Greek omega", insertText: "omega" },
  { label: "infty", detail: "Infinity", insertText: "infinity" },
  { label: "in", detail: "Element of", insertText: "in" },
  { label: "notin", detail: "Not element of", insertText: "in.not" },
  { label: "subset", detail: "Subset", insertText: "subset" },
  { label: "supset", detail: "Superset", insertText: "supset" },
  { label: "le", detail: "Less than or equal", insertText: "lt.eq" },
  { label: "ge", detail: "Greater than or equal", insertText: "gt.eq" },
  { label: "neq", detail: "Not equal", insertText: "eq.not" },
  { label: "approx", detail: "Approximately", insertText: "approx" },
  { label: "equiv", detail: "Equivalent", insertText: "equiv" },
  { label: "rightarrow", detail: "Right arrow", insertText: "arrow.r" },
  { label: "leftarrow", detail: "Left arrow", insertText: "arrow.l" },
  { label: "Rightarrow", detail: "Double right arrow", insertText: "arrow.r.double" },
  { label: "Leftarrow", detail: "Double left arrow", insertText: "arrow.l.double" },
  { label: "forall", detail: "For all", insertText: "forall" },
  { label: "exists", detail: "Exists", insertText: "exists" },
  { label: "nabla", detail: "Nabla", insertText: "nabla" },
  { label: "partial", detail: "Partial", insertText: "partial" },
  { label: "dots", detail: "Dots", insertText: "dots" },
  { label: "pm", detail: "Plus minus", insertText: "plus.minus" },
  { label: "times", detail: "Times", insertText: "times" },
  { label: "div", detail: "Division", insertText: "div" },
  { label: "cdot", detail: "Center dot", insertText: "dot.op" },
  { label: "circ", detail: "Circle", insertText: "circle.small" },
  { label: "angle", detail: "Angle", insertText: "angle" },
  { label: "perp", detail: "Perpendicular", insertText: "perp" },
  { label: "parallel", detail: "Parallel", insertText: "parallel" },
  { label: "sum", detail: "Summation", insertText: "sum" },
  { label: "prod", detail: "Product", insertText: "prod" },
  { label: "integral", detail: "Integral", insertText: "integral" },
]

function createCompletions(): Completion[] {
  const completions: Completion[] = []

  typstKeywords.forEach((k) =>
    completions.push({
      label: k,
      type: "keyword",
      detail: "Typst keyword",
    })
  )

  typstFunctions.forEach((f) =>
    completions.push({
      label: f.label,
      type: "function",
      detail: f.detail,
      apply: f.insertText,
    })
  )

  typstSymbols.forEach((s) =>
    completions.push({
      label: s.label,
      type: "type",
      detail: s.detail,
      apply: s.insertText,
    })
  )

  return completions
}

const typstCompletions = createCompletions()

export const typstAutocomplete: CompletionSource = (context: CompletionContext) => {
  const word = context.matchBefore(/[\w.#-]+/)
  if (!word || (word.from === word.to && !context.explicit)) return null

  return {
    from: word.from,
    options: typstCompletions,
    validFor: /[\w.#-]+/,
  }
}

export default typstAutocomplete
