export interface TypstSymbol {
  name: string
  insert: string
  category: string
  description?: string
}

export const typstSymbolCategories = [
  "Greek",
  "Math",
  "Arrows",
  "Operators",
  "Relations",
  "Brackets",
  "Sets",
  "Calculus",
  "Logic",
  "Geometry",
  "Misc",
]

export const typstSymbols: TypstSymbol[] = [
  // Greek letters
  { name: "alpha", insert: "alpha", category: "Greek", description: "Greek alpha" },
  { name: "beta", insert: "beta", category: "Greek", description: "Greek beta" },
  { name: "gamma", insert: "gamma", category: "Greek", description: "Greek gamma" },
  { name: "delta", insert: "delta", category: "Greek", description: "Greek delta" },
  { name: "epsilon", insert: "epsilon", category: "Greek", description: "Greek epsilon" },
  { name: "zeta", insert: "zeta", category: "Greek", description: "Greek zeta" },
  { name: "eta", insert: "eta", category: "Greek", description: "Greek eta" },
  { name: "theta", insert: "theta", category: "Greek", description: "Greek theta" },
  { name: "iota", insert: "iota", category: "Greek", description: "Greek iota" },
  { name: "kappa", insert: "kappa", category: "Greek", description: "Greek kappa" },
  { name: "lambda", insert: "lambda", category: "Greek", description: "Greek lambda" },
  { name: "mu", insert: "mu", category: "Greek", description: "Greek mu" },
  { name: "nu", insert: "nu", category: "Greek", description: "Greek nu" },
  { name: "xi", insert: "xi", category: "Greek", description: "Greek xi" },
  { name: "omicron", insert: "omicron", category: "Greek", description: "Greek omicron" },
  { name: "pi", insert: "pi", category: "Greek", description: "Greek pi" },
  { name: "rho", insert: "rho", category: "Greek", description: "Greek rho" },
  { name: "sigma", insert: "sigma", category: "Greek", description: "Greek sigma" },
  { name: "tau", insert: "tau", category: "Greek", description: "Greek tau" },
  { name: "upsilon", insert: "upsilon", category: "Greek", description: "Greek upsilon" },
  { name: "phi", insert: "phi", category: "Greek", description: "Greek phi" },
  { name: "chi", insert: "chi", category: "Greek", description: "Greek chi" },
  { name: "psi", insert: "psi", category: "Greek", description: "Greek psi" },
  { name: "omega", insert: "omega", category: "Greek", description: "Greek omega" },
  { name: "Alpha", insert: "Alpha", category: "Greek", description: "Greek Alpha" },
  { name: "Beta", insert: "Beta", category: "Greek", description: "Greek Beta" },
  { name: "Gamma", insert: "Gamma", category: "Greek", description: "Greek Gamma" },
  { name: "Delta", insert: "Delta", category: "Greek", description: "Greek Delta" },
  { name: "Theta", insert: "Theta", category: "Greek", description: "Greek Theta" },
  { name: "Lambda", insert: "Lambda", category: "Greek", description: "Greek Lambda" },
  { name: "Pi", insert: "Pi", category: "Greek", description: "Greek Pi" },
  { name: "Sigma", insert: "Sigma", category: "Greek", description: "Greek Sigma" },
  { name: "Omega", insert: "Omega", category: "Greek", description: "Greek Omega" },

  // Math functions
  { name: "sqrt", insert: "sqrt(", category: "Math", description: "Square root" },
  { name: "frac", insert: "frac(,)", category: "Math", description: "Fraction" },
  { name: "sum", insert: "sum", category: "Math", description: "Summation" },
  { name: "prod", insert: "prod", category: "Math", description: "Product" },
  { name: "integral", insert: "integral", category: "Math", description: "Integral" },
  { name: "lim", insert: "lim", category: "Math", description: "Limit" },
  { name: "abs", insert: "abs(", category: "Math", description: "Absolute value" },
  { name: "floor", insert: "floor(", category: "Math", description: "Floor" },
  { name: "ceil", insert: "ceil(", category: "Math", description: "Ceiling" },
  { name: "round", insert: "round(", category: "Math", description: "Round" },
  { name: "max", insert: "max(", category: "Math", description: "Maximum" },
  { name: "min", insert: "min(", category: "Math", description: "Minimum" },
  { name: "log", insert: "log(", category: "Math", description: "Logarithm" },
  { name: "ln", insert: "ln(", category: "Math", description: "Natural log" },
  { name: "exp", insert: "exp(", category: "Math", description: "Exponential" },
  { name: "sin", insert: "sin(", category: "Math", description: "Sine" },
  { name: "cos", insert: "cos(", category: "Math", description: "Cosine" },
  { name: "tan", insert: "tan(", category: "Math", description: "Tangent" },
  { name: "infinity", insert: "infinity", category: "Math", description: "Infinity" },
  { name: "emptyset", insert: "emptyset", category: "Math", description: "Empty set" },
  { name: "forall", insert: "forall", category: "Math", description: "For all" },
  { name: "exists", insert: "exists", category: "Math", description: "Exists" },
  { name: "nabla", insert: "nabla", category: "Math", description: "Nabla" },
  { name: "partial", insert: "partial", category: "Math", description: "Partial derivative" },
  { name: "prime", insert: "prime", category: "Math", description: "Prime" },
  { name: "tilde", insert: "tilde", category: "Math", description: "Tilde" },
  { name: "hat", insert: "hat(", category: "Math", description: "Hat accent" },
  { name: "bar", insert: "bar(", category: "Math", description: "Bar accent" },
  { name: "vec", insert: "vec(", category: "Math", description: "Vector accent" },
  { name: "dot", insert: "dot(", category: "Math", description: "Dot accent" },
  { name: "ddot", insert: "ddot(", category: "Math", description: "Double dot accent" },

  // Arrows
  { name: "arrow.r", insert: "arrow.r", category: "Arrows", description: "Right arrow" },
  { name: "arrow.l", insert: "arrow.l", category: "Arrows", description: "Left arrow" },
  { name: "arrow.t", insert: "arrow.t", category: "Arrows", description: "Up arrow" },
  { name: "arrow.b", insert: "arrow.b", category: "Arrows", description: "Down arrow" },
  { name: "arrow.rt", insert: "arrow.rt", category: "Arrows", description: "Right-top arrow" },
  { name: "arrow.lt", insert: "arrow.lt", category: "Arrows", description: "Left-top arrow" },
  { name: "arrow.rb", insert: "arrow.rb", category: "Arrows", description: "Right-bottom arrow" },
  { name: "arrow.lb", insert: "arrow.lb", category: "Arrows", description: "Left-bottom arrow" },
  { name: "arrow.r.long", insert: "arrow.r.long", category: "Arrows", description: "Long right arrow" },
  { name: "arrow.l.long", insert: "arrow.l.long", category: "Arrows", description: "Long left arrow" },
  { name: "arrow.r.double", insert: "arrow.r.double", category: "Arrows", description: "Double right arrow" },
  { name: "arrow.l.double", insert: "arrow.l.double", category: "Arrows", description: "Double left arrow" },
  { name: "arrow.r.double.long", insert: "arrow.r.double.long", category: "Arrows", description: "Long double right arrow" },
  { name: "harpoon.rt", insert: "harpoon.rt", category: "Arrows", description: "Right harpoon" },
  { name: "harpoon.lt", insert: "harpoon.lt", category: "Arrows", description: "Left harpoon" },
  { name: "mapsto", insert: "mapsto", category: "Arrows", description: "Maps to" },

  // Operators
  { name: "plus", insert: "plus", category: "Operators", description: "Plus" },
  { name: "minus", insert: "minus", category: "Operators", description: "Minus" },
  { name: "dot.op", insert: "dot.op", category: "Operators", description: "Dot operator" },
  { name: "times", insert: "times", category: "Operators", description: "Times" },
  { name: "div", insert: "div", category: "Operators", description: "Divide" },
  { name: "pm", insert: "plus.minus", category: "Operators", description: "Plus-minus" },
  { name: "mp", insert: "minus.plus", category: "Operators", description: "Minus-plus" },
  { name: "ast", insert: "ast", category: "Operators", description: "Asterisk" },
  { name: "star", insert: "star", category: "Operators", description: "Star" },
  { name: "circ", insert: "circle.small", category: "Operators", description: "Circle" },
  { name: "oplus", insert: "plus.circle", category: "Operators", description: "Direct sum" },
  { name: "otimes", insert: "times.circle", category: "Operators", description: "Tensor product" },
  { name: "cup", insert: "union", category: "Operators", description: "Union" },
  { name: "cap", insert: "sect", category: "Operators", description: "Intersection" },
  { name: "wedge", insert: "and", category: "Operators", description: "Logical and" },
  { name: "vee", insert: "or", category: "Operators", description: "Logical or" },

  // Relations
  { name: "eq", insert: "eq", category: "Relations", description: "Equals" },
  { name: "neq", insert: "eq.not", category: "Relations", description: "Not equal" },
  { name: "approx", insert: "approx", category: "Relations", description: "Approximately" },
  { name: "sim", insert: "tilde.op", category: "Relations", description: "Similar" },
  { name: "simeq", insert: "tilde.eq", category: "Relations", description: "Asymptotically equal" },
  { name: "equiv", insert: "equiv", category: "Relations", description: "Equivalent" },
  { name: "cong", insert: "tilde.op", category: "Relations", description: "Congruent" },
  { name: "lt", insert: "lt", category: "Relations", description: "Less than" },
  { name: "gt", insert: "gt", category: "Relations", description: "Greater than" },
  { name: "le", insert: "lt.eq", category: "Relations", description: "Less than or equal" },
  { name: "ge", insert: "gt.eq", category: "Relations", description: "Greater than or equal" },
  { name: "ll", insert: "lt.double", category: "Relations", description: "Much less than" },
  { name: "gg", insert: "gt.double", category: "Relations", description: "Much greater than" },
  { name: "subset", insert: "subset", category: "Relations", description: "Subset" },
  { name: "supset", insert: "supset", category: "Relations", description: "Superset" },
  { name: "subseteq", insert: "subset.eq", category: "Relations", description: "Subset or equal" },
  { name: "supseteq", insert: "supset.eq", category: "Relations", description: "Superset or equal" },
  { name: "in", insert: "in", category: "Relations", description: "Element of" },
  { name: "notin", insert: "in.not", category: "Relations", description: "Not element of" },
  { name: "ni", insert: "in.rev", category: "Relations", description: "Contains" },
  { name: "propto", insert: "propto", category: "Relations", description: "Proportional to" },
  { name: "perp", insert: "perp", category: "Relations", description: "Perpendicular" },
  { name: "parallel", insert: "parallel", category: "Relations", description: "Parallel" },

  // Brackets
  { name: "(", insert: "(", category: "Brackets", description: "Left parenthesis" },
  { name: ")", insert: ")", category: "Brackets", description: "Right parenthesis" },
  { name: "[", insert: "[", category: "Brackets", description: "Left bracket" },
  { name: "]", insert: "]", category: "Brackets", description: "Right bracket" },
  { name: "{", insert: "{", category: "Brackets", description: "Left brace" },
  { name: "}", insert: "}", category: "Brackets", description: "Right brace" },
  { name: "angle.l", insert: "angle.l", category: "Brackets", description: "Left angle" },
  { name: "angle.r", insert: "angle.r", category: "Brackets", description: "Right angle" },
  { name: "ceil.l", insert: "ceil.l", category: "Brackets", description: "Left ceiling" },
  { name: "ceil.r", insert: "ceil.r", category: "Brackets", description: "Right ceiling" },
  { name: "floor.l", insert: "floor.l", category: "Brackets", description: "Left floor" },
  { name: "floor.r", insert: "floor.r", category: "Brackets", description: "Right floor" },
  { name: "abs", insert: "abs(", category: "Brackets", description: "Absolute value" },
  { name: "norm", insert: "norm(", category: "Brackets", description: "Norm" },

  // Sets
  { name: "union", insert: "union", category: "Sets", description: "Set union" },
  { name: "inter", insert: "sect", category: "Sets", description: "Set intersection" },
  { name: "emptyset", insert: "emptyset", category: "Sets", description: "Empty set" },
  { name: "nat", insert: "NN", category: "Sets", description: "Natural numbers" },
  { name: "int", insert: "ZZ", category: "Sets", description: "Integers" },
  { name: "rat", insert: "QQ", category: "Sets", description: "Rational numbers" },
  { name: "real", insert: "RR", category: "Sets", description: "Real numbers" },
  { name: "complex", insert: "CC", category: "Sets", description: "Complex numbers" },
  { name: "aleph", insert: "aleph", category: "Sets", description: "Aleph" },

  // Calculus
  { name: "integral", insert: "integral", category: "Calculus", description: "Integral" },
  { name: "integral.triple", insert: "integral.triple", category: "Calculus", description: "Triple integral" },
  { name: "sum", insert: "sum", category: "Calculus", description: "Summation" },
  { name: "prod", insert: "prod", category: "Calculus", description: "Product" },
  { name: "diff", insert: "diff", category: "Calculus", description: "Differential" },
  { name: "partial", insert: "partial", category: "Calculus", description: "Partial" },
  { name: "nabla", insert: "nabla", category: "Calculus", description: "Nabla" },
  { name: "oo", insert: "infinity", category: "Calculus", description: "Infinity" },

  // Logic
  { name: "forall", insert: "forall", category: "Logic", description: "For all" },
  { name: "exists", insert: "exists", category: "Logic", description: "Exists" },
  { name: "notexists", insert: "exists.not", category: "Logic", description: "Not exists" },
  { name: "and", insert: "and", category: "Logic", description: "Logical and" },
  { name: "or", insert: "or", category: "Logic", description: "Logical or" },
  { name: "not", insert: "not", category: "Logic", description: "Logical not" },
  { name: "implies", insert: "arrow.r.double", category: "Logic", description: "Implies" },
  { name: "iff", insert: "arrow.r.double.long", category: "Logic", description: "If and only if" },
  { name: "top", insert: "top", category: "Logic", description: "Top" },
  { name: "bot", insert: "bot", category: "Logic", description: "Bottom" },

  // Geometry
  { name: "angle", insert: "angle", category: "Geometry", description: "Angle" },
  { name: "angle.arc", insert: "angle.arc", category: "Geometry", description: "Arc angle" },
  { name: "perp", insert: "perp", category: "Geometry", description: "Perpendicular" },
  { name: "parallel", insert: "parallel", category: "Geometry", description: "Parallel" },
  { name: "triangle", insert: "triangle", category: "Geometry", description: "Triangle" },
  { name: "square", insert: "square", category: "Geometry", description: "Square" },
  { name: "circle", insert: "circle", category: "Geometry", description: "Circle" },
  { name: "diameter", insert: "diameter", category: "Geometry", description: "Diameter" },

  // Misc
  { name: "dots", insert: "dots", category: "Misc", description: "Ellipsis" },
  { name: "dots.h", insert: "dots.h", category: "Misc", description: "Horizontal dots" },
  { name: "dots.v", insert: "dots.v", category: "Misc", description: "Vertical dots" },
  { name: "dots.down", insert: "dots.down", category: "Misc", description: "Diagonal dots" },
  { name: "degree", insert: "degree", category: "Misc", description: "Degree" },
  { name: "percent", insert: "percent", category: "Misc", description: "Percent" },
  { name: "permille", insert: "permille", category: "Misc", description: "Per mille" },
  { name: "prime", insert: "prime", category: "Misc", description: "Prime" },
  { name: "section", insert: "section", category: "Misc", description: "Section" },
  { name: "paragraph", insert: "paragraph", category: "Misc", description: "Paragraph" },
  { name: "copyright", insert: "copyright", category: "Misc", description: "Copyright" },
  { name: "trademark", insert: "trademark", category: "Misc", description: "Trademark" },
  { name: "ellipsis", insert: "ellipsis", category: "Misc", description: "Ellipsis" },
  { name: "quote.l", insert: "quote.l", category: "Misc", description: "Left quote" },
  { name: "quote.r", insert: "quote.r", category: "Misc", description: "Right quote" },
  { name: "quote.l.double", insert: "quote.l.double", category: "Misc", description: "Left double quote" },
  { name: "quote.r.double", insert: "quote.r.double", category: "Misc", description: "Right double quote" },
]

export function getSymbolsByCategory(category: string): TypstSymbol[] {
  return typstSymbols.filter((s) => s.category === category)
}

export function searchSymbols(query: string): TypstSymbol[] {
  const q = query.toLowerCase().trim()
  if (!q) return typstSymbols
  return typstSymbols.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.insert.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      s.category.toLowerCase().includes(q)
  )
}
