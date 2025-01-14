// highlights.js
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const Highlights = Extension.create({
  name: "highlights",
  addOptions: () => ({
    highlights: [],
  }),
  addProseMirrorPlugins() {
    const createRegex = (pattern) =>
      typeof pattern === "string" ? new RegExp(pattern, "g") : pattern

    return [
      new Plugin({
        key: new PluginKey("highlights"),
        props: {
          decorations: (state) => {
            const decorations = []

            state.doc.descendants((node, pos) => {
              if (!node.isText) return

              this.options.highlights.forEach(
                ({ pattern, class: className }) => {
                  const regex = createRegex(pattern)
                  let match

                  while ((match = regex.exec(node.text))) {
                    const from = pos + match.index
                    const to = from + match[0].length
                    decorations.push(
                      Decoration.inline(from, to, { class: className })
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
