import { Mark } from "@tiptap/core";
import type { JSONContent, MarkdownRendererHelpers } from "@tiptap/core";

/**
 * `code: true` exempts marked text from the markdown serializer's
 * backslash escaping, which would corrupt KirbyTags like
 * (image: my_file.jpg). Never in the live document — protectKirbyTags()
 * injects it just before serialization.
 */
export const KirbytagRaw = Mark.create({
	name: "kirbytagRaw",
	code: true,

	renderHTML() {
		return ["span", 0];
	},

	renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) =>
		helpers.renderChildren(node.content ?? []),
});
