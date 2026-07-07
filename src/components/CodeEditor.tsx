"use client"

import { useEffect, useRef, useCallback } from "react"
import { useEditorStore } from "@/store/editor"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, HighlightStyle } from "@codemirror/language"
import { closeBrackets, autocompletion } from "@codemirror/autocomplete"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { tags } from "@lezer/highlight"
import { typstLanguage } from "@/lib/typst-lang"

const vsCodeStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#569cd6" },
  { tag: tags.controlKeyword, color: "#569cd6" },
  { tag: tags.definitionKeyword, color: "#569cd6" },
  { tag: tags.moduleKeyword, color: "#569cd6" },
  { tag: tags.string, color: "#ce9178" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.definition(tags.function(tags.variableName)), color: "#dcdcaa" },
  { tag: tags.function(tags.propertyName), color: "#dcdcaa" },
  { tag: tags.function(tags.typeName), color: "#dcdcaa" },
  { tag: tags.typeName, color: "#4ec9b0" },
  { tag: tags.className, color: "#4ec9b0" },
  { tag: tags.comment, color: "#6a9955", fontStyle: "italic" },
  { tag: tags.bool, color: "#569cd6" },
  { tag: tags.regexp, color: "#ce9178" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.compareOperator, color: "#d4d4d4" },
  { tag: tags.bracket, color: "#d4d4d4" },
  { tag: tags.squareBracket, color: "#d4d4d4" },
  { tag: tags.paren, color: "#d4d4d4" },
  { tag: tags.brace, color: "#d4d4d4" },
  { tag: tags.angleBracket, color: "#d4d4d4" },
  { tag: tags.propertyName, color: "#9cdcfe" },
  { tag: tags.attributeName, color: "#9cdcfe" },
  { tag: tags.labelName, color: "#9cdcfe" },
  { tag: tags.variableName, color: "#d4d4d4" },
  { tag: tags.local(tags.variableName), color: "#d4d4d4" },
  { tag: tags.special(tags.variableName), color: "#dcdcaa" },
  { tag: tags.self, color: "#569cd6" },
  { tag: tags.color, color: "#ce9178" },
  { tag: tags.tagName, color: "#569cd6" },
  { tag: tags.meta, color: "#d4d4d4" },
  { tag: tags.heading, color: "#569cd6", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "#569cd6", textDecoration: "underline" },
  { tag: tags.url, color: "#569cd6", textDecoration: "underline" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.invalid, color: "#f44747" },
  { tag: tags.monospace, color: "#ce9178" },
  { tag: tags.separator, color: "#d4d4d4" },
  { tag: tags.escape, color: "#d7ba7d" },
  { tag: tags.inserted, color: "#b5cea8" },
  { tag: tags.deleted, color: "#f44747" },
  { tag: tags.changed, color: "#dcdcaa" },
])

const customTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", height: "100%" },
  ".cm-scroller": { fontFamily: '"JetBrains Mono", monospace' },
  ".cm-content": { caretColor: "#d4a04a" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#d4a04a" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { background: "#d4a04a20 !important" },
  ".cm-activeLine": { backgroundColor: "#d4a04a08" },
  ".cm-activeLineGutter": { backgroundColor: "#d4a04a10" },
  ".cm-gutters": { backgroundColor: "transparent", borderRight: "1px solid #1e1e26", color: "#5c5c66" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px" },
  ".cm-matchingBracket": { backgroundColor: "#d4a04a30", outline: "1px solid #d4a04a50" },
})

export default function CodeEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { currentContent, setCurrentContent } = useEditorStore()

  const onUpdate = useCallback(
    (update: import("@codemirror/view").ViewUpdate) => {
      if (update.docChanged) {
        setCurrentContent(update.state.doc.toString())
      }
    },
    [setCurrentContent]
  )

  useEffect(() => {
    if (!editorRef.current) return

    const startState = EditorState.create({
      doc: currentContent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        history(),
        autocompletion(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        syntaxHighlighting(vsCodeStyle, { fallback: true }),
        typstLanguage(),
        customTheme,
        EditorView.updateListener.of(onUpdate),
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({ state: startState, parent: editorRef.current })
    viewRef.current = view

    return () => { view.destroy(); viewRef.current = null }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== currentContent) {
      view.dispatch({ changes: { from: 0, to: currentDoc.length, insert: currentContent } })
    }
  }, [currentContent])

  return <div className="h-full overflow-hidden"><div ref={editorRef} className="h-full" /></div>
}
