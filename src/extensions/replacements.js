import { Extension, textInputRule } from "@tiptap/core"

export const Replacements = Extension.create({
  name: "replacements",

  addInputRules() {
    return [
      textInputRule({
        find: /\(-\)$/,
        replace: "\u00AD",
      }),
      textInputRule({
        find: /\(_\)$/,
        replace: "\u00A0",
      }),
    ]
  },
})
