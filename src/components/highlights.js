import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

/**
 * Custom Tiptap extension that adds text highlighting functionality
 */
export const Highlights = Extension.create({
  name: "highlights",

  addOptions: () => ({
    highlights: [] /* Array of {pattern, class} objects */,
  }),

  addProseMirrorPlugins() {
    /* Helper to create RegExp from string or use existing RegExp */
    const createRegex = (pattern) =>
      typeof pattern === "string" ? new RegExp(pattern, "g") : pattern

    return [
      new Plugin({
        key: new PluginKey("highlights"),
        props: {
          decorations: (state) => {
            const decorations = []

            /* Traverse document to find text matches */
            state.doc.descendants((node, pos) => {
              if (!node.isText) return

              /* Apply each highlight pattern */
              this.options.highlights.forEach(
                ({ pattern, class: className }) => {
                  const regex = createRegex(pattern)
                  let match

                  /* Find all matches in current text node */
                  while ((match = regex.exec(node.text))) {
                    const from = pos + match.index
                    const to = from + match[0].length

                    /* Create inline decoration for the match */
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
