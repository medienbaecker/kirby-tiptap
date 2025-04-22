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
    return [
      new Plugin({
        key: new PluginKey("highlights"),
        props: {
          decorations: (state) => {
            const decorations = []

            state.doc.descendants((node, pos) => {
              if (!node.isText) return

              // Highlight Kirbytags
              if (this.options.kirbytags.length) {
                const kirbytagRegex = new RegExp(
                  `\\((?:${this.options.kirbytags.join(
                    "|"
                  )}):[^()]*(?:\\([^()]*\\)[^()]*)*\\)`,
                  "g"
                )

                let match
                while ((match = kirbytagRegex.exec(node.text))) {
                  decorations.push(
                    Decoration.inline(
                      pos + match.index,
                      pos + match.index + match[0].length,
                      { class: "kirbytag" }
                    )
                  )
                }
              }

              // Apply custom highlights
              this.options.highlights.forEach(
                ({ pattern, class: className, title }) => {
                  const regex =
                    typeof pattern === "string"
                      ? new RegExp(pattern, "g")
                      : pattern

                  let match
                  while ((match = regex.exec(node.text))) {
                    const attrs = { class: className }

                    // Add title attribute if provided
                    if (title) {
                      attrs.title = title
                    }

                    decorations.push(
                      Decoration.inline(
                        pos + match.index,
                        pos + match.index + match[0].length,
                        attrs
                      )
                    )
                  }
                }
              )
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
