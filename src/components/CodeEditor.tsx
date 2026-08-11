"use client"

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import { useEditorStore } from "@/store/editor"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from "@codemirror/commands"
import { syntaxHighlighting, indentOnInput, bracketMatching, HighlightStyle, Language, defineLanguageFacet, LanguageSupport, indentService, indentUnit } from "@codemirror/language"
import { closeBrackets, autocompletion, completionKeymap, acceptCompletion } from "@codemirror/autocomplete"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { tags } from "@lezer/highlight"
import { TypstParser, typstHighlight } from "codemirror-lang-typst"
import { typstAutocomplete } from "@/lib/typst-autocomplete"

const typstLanguageData = defineLanguageFacet({ commentTokens: { block: { open: "/*", close: "*/" } } })

function typstLanguageSupport() {
  const parser = new (TypstParser as any)(typstHighlight)
  const language = new Language(typstLanguageData, parser, [parser.updateListener()], "typst")
  return new LanguageSupport(language, [
    syntaxHighlighting(typstThemeStyle),
    indentUnit.of("  "),
    indentService.of((context, pos) => {
      const line = context.state.doc.lineAt(pos)
      if (line.number <= 1) return null
      const prevLine = context.state.doc.line(line.number - 1)
      return context.lineIndent(prevLine.from)
    }),
  ])
}

export interface CodeEditorHandle {
  insertText: (text: string) => void
  jumpToLine: (line: number) => void
}

const typstThemeStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#f2e58c" },
  { tag: tags.controlKeyword, color: "#f2e58c" },
  { tag: tags.definitionKeyword, color: "#f2e58c" },
  { tag: tags.moduleKeyword, color: "#f2e58c" },
  { tag: tags.operatorKeyword, color: "#f2e58c" },
  { tag: tags.string, color: "#f5c1a3" },
  { tag: tags.number, color: "#f2e58c" },
  { tag: tags.function(tags.variableName), color: "#eb8275" },
  { tag: tags.definition(tags.function(tags.variableName)), color: "#eb8275" },
  { tag: tags.function(tags.propertyName), color: "#eb8275" },
  { tag: tags.function(tags.typeName), color: "#eb8275" },
  { tag: tags.typeName, color: "#eb8275" },
  { tag: tags.className, color: "#eb8275" },
  { tag: tags.comment, color: "#4e4641", fontStyle: "italic" },
  { tag: tags.bool, color: "#eb8275" },
  { tag: tags.regexp, color: "#69a404" },
  { tag: tags.operator, color: "#69a404" },
  { tag: tags.compareOperator, color: "#69a404" },
  { tag: tags.bracket, color: "#4e4641" },
  { tag: tags.squareBracket, color: "#4e4641" },
  { tag: tags.paren, color: "#4e4641" },
  { tag: tags.brace, color: "#4e4641" },
  { tag: tags.angleBracket, color: "#4e4641" },
  { tag: tags.propertyName, color: "#eb8275" },
  { tag: tags.attributeName, color: "#f5c1a3" },
  { tag: tags.attributeValue, color: "#f2e58c" },
  { tag: tags.labelName, color: "#f5c1a3" },
  { tag: tags.variableName, color: "#69a404" },
  { tag: tags.local(tags.variableName), color: "#69a404" },
  { tag: tags.special(tags.variableName), color: "#eb8275" },
  { tag: tags.self, color: "#f2e58c" },
  { tag: tags.color, color: "#919886" },
  { tag: tags.tagName, color: "#eb8275" },
  { tag: tags.meta, color: "#4e4641" },
  { tag: tags.heading, color: "#f2e58c", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, color: "#69a404", fontWeight: "bold" },
  { tag: tags.link, color: "#69a404", textDecoration: "underline" },
  { tag: tags.url, color: "#69a404", textDecoration: "underline" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.invalid, color: "#eb8275" },
  { tag: tags.monospace, color: "#f5c1a3" },
  { tag: tags.separator, color: "#4e4641" },
  { tag: tags.escape, color: "#f2e58c" },
  { tag: tags.inserted, color: "#f5c1a3" },
  { tag: tags.deleted, color: "#eb8275" },
  { tag: tags.changed, color: "#f2e58c" },
])

const customTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", height: "100%", color: "#f9f7f6" },
  ".cm-scroller": { fontFamily: '"JetBrains Mono", monospace' },
  ".cm-content": { caretColor: "#f2e58c" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#f2e58c" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { background: "#8f481e !important" },
  ".cm-activeLine": { backgroundColor: "#433c3854" },
  ".cm-activeLineGutter": { backgroundColor: "#433c3854" },
  ".cm-gutters": { backgroundColor: "transparent", borderRight: "1px solid #4e4641", color: "#4e4641" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px" },
  ".cm-matchingBracket": { backgroundColor: "#8f481e50", outline: "1px solid #8f481e80" },
})

function tabCommand(view: EditorView) {
  return acceptCompletion(view) || indentMore(view)
}

function shiftTabCommand(view: EditorView) {
  return indentLess(view)
}

function reportEditorSync(view: EditorView) {
  const { setEditorSync } = useEditorStore.getState()
  const doc = view.state.doc
  const totalLines = doc.lines
  if (totalLines < 1) return

  // Prefer the line under the viewport center so scrolling tracks content;
  // fall back to cursor when viewport is tiny.
  const rect = view.scrollDOM.getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  let line = view.state.selection.main.head
  try {
    const pos = view.posAtCoords({ x: rect.left + 40, y: midY })
    if (pos != null) line = pos
  } catch {
    /* ignore */
  }
  const lineNum = doc.lineAt(line).number
  const scrollEl = view.scrollDOM
  const maxScroll = Math.max(1, scrollEl.scrollHeight - scrollEl.clientHeight)
  const scrollRatio = Math.min(1, Math.max(0, scrollEl.scrollTop / maxScroll))

  setEditorSync({ line: lineNum, totalLines, scrollRatio })
}

function jumpViewToLine(view: EditorView, line: number) {
  const doc = view.state.doc
  const target = Math.min(Math.max(1, Math.round(line)), doc.lines)
  const lineObj = doc.line(target)
  view.dispatch({
    selection: { anchor: lineObj.from },
    effects: EditorView.scrollIntoView(lineObj.from, { y: "center" }),
  })
  view.focus()
}

const CodeEditor = forwardRef<CodeEditorHandle, {}>(function CodeEditor(_props, ref) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { currentContent, setCurrentContent, jumpToSource, clearJumpToSource } =
    useEditorStore()
  const syncRafRef = useRef<number | null>(null)

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      const view = viewRef.current
      if (!view) return
      const selection = view.state.selection.main
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: text },
        selection: { anchor: selection.from + text.length },
      })
      view.focus()
    },
    jumpToLine: (line: number) => {
      const view = viewRef.current
      if (!view) return
      jumpViewToLine(view, line)
    },
  }))

  // Preview click → jump to source line
  useEffect(() => {
    if (!jumpToSource) return
    const view = viewRef.current
    if (!view) return
    const total = view.state.doc.lines
    const line =
      jumpToSource.line > 0
        ? jumpToSource.line
        : 1 + Math.round(jumpToSource.ratio * Math.max(0, total - 1))
    jumpViewToLine(view, line)
    clearJumpToSource()
  }, [jumpToSource, clearJumpToSource])

  const scheduleSync = useCallback((view: EditorView) => {
    if (syncRafRef.current != null) cancelAnimationFrame(syncRafRef.current)
    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = null
      reportEditorSync(view)
    })
  }, [])

  const onUpdate = useCallback(
    (update: import("@codemirror/view").ViewUpdate) => {
      if (update.docChanged) {
        setCurrentContent(update.state.doc.toString())
      }
      if (update.docChanged || update.selectionSet || update.geometryChanged) {
        scheduleSync(update.view)
      }
    },
    [setCurrentContent, scheduleSync]
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
        autocompletion({
          override: [typstAutocomplete],
          defaultKeymap: true,
          icons: false,
        }),
        keymap.of([
          { key: "Tab", run: tabCommand },
          { key: "Shift-Tab", run: shiftTabCommand },
          ...defaultKeymap.filter((b) => b.key !== "Tab"),
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
        ]),
        typstLanguageSupport(),
        customTheme,
        EditorView.updateListener.of(onUpdate),
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({ state: startState, parent: editorRef.current })
    viewRef.current = view

    // scroll events do not bubble — bind directly on the scroller
    const onScroll = () => scheduleSync(view)
    view.scrollDOM.addEventListener("scroll", onScroll, { passive: true })
    scheduleSync(view)

    return () => {
      view.scrollDOM.removeEventListener("scroll", onScroll)
      if (syncRafRef.current != null) cancelAnimationFrame(syncRafRef.current)
      view.destroy()
      viewRef.current = null
    }
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
})

export default CodeEditor
