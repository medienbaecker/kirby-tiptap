import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const Kirbytag = Extension.create({
  name: "kirbytag",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("kirbytag"),
        props: {
          decorations: (state) => {
            const { doc } = state
            const decorations = []

            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text
                const regex = /\([a-z]+:\s*[^\)]+\)/g
                let match

                while ((match = regex.exec(text)) !== null) {
                  const from = pos + match.index
                  const to = from + match[0].length

                  decorations.push(
                    Decoration.inline(from, to, {
                      class: "kirbytag",
                    })
                  )
                }
              }
            })

            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})
