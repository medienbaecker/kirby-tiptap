import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const Highlights = Extension.create({
  name: "highlights",

  addOptions() {
    return {
      highlights: [],
      kirbytags: [],
    }
  },

  addProseMirrorPlugins() {
    const { highlights } = this.options
    const kirbytagRegex = /\([^)]+?\)/g

    return [
      new Plugin({
        key: new PluginKey("highlights"),
        props: {
          decorations: (state) => {
            const decorations = []

            state.doc.descendants((node, pos) => {
              if (!node.isText) return

              let lastProcessedIndex = 0
              let kirbytagMatch

              while ((kirbytagMatch = kirbytagRegex.exec(node.text))) {
                const textBeforeTag = node.text.slice(
                  lastProcessedIndex,
                  kirbytagMatch.index
                )
                const hasTextBeforeTag =
                  kirbytagMatch.index > lastProcessedIndex

                if (hasTextBeforeTag) {
                  highlights.forEach(({ pattern, class: className, title }) => {
                    const regex =
                      typeof pattern === "string"
                        ? new RegExp(pattern, "g")
                        : new RegExp(pattern.source, pattern.flags + "g")

                    let highlightMatch
                    while ((highlightMatch = regex.exec(textBeforeTag))) {
                      const highlightPos = pos + lastProcessedIndex
                      const decoration = Decoration.inline(
                        highlightPos + highlightMatch.index,
                        highlightPos +
                          highlightMatch.index +
                          highlightMatch[0].length,
                        { class: className, ...(title && { title }) }
                      )
                      decorations.push(decoration)
                    }
                  })
                }

                decorations.push(
                  Decoration.inline(
                    pos + kirbytagMatch.index,
                    pos + kirbytagMatch.index + kirbytagMatch[0].length,
                    { class: "kirbytag" }
                  )
                )

                lastProcessedIndex =
                  kirbytagMatch.index + kirbytagMatch[0].length
              }

              const hasRemainingText = lastProcessedIndex < node.text.length
              if (hasRemainingText) {
                const remainingText = node.text.slice(lastProcessedIndex)

                highlights.forEach(({ pattern, class: className, title }) => {
                  const regex =
                    typeof pattern === "string"
                      ? new RegExp(pattern, "g")
                      : new RegExp(pattern.source, pattern.flags + "g")

                  let highlightMatch
                  while ((highlightMatch = regex.exec(remainingText))) {
                    const highlightPos = pos + lastProcessedIndex
                    const decoration = Decoration.inline(
                      highlightPos + highlightMatch.index,
                      highlightPos +
                        highlightMatch.index +
                        highlightMatch[0].length,
                      { class: className, ...(title && { title }) }
                    )
                    decorations.push(decoration)
                  }
                })
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
