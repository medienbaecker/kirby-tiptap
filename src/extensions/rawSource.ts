import { Mark, Node } from "@tiptap/core";
import type { JSONContent, MarkdownRendererHelpers } from "@tiptap/core";

const HTML_ATTRS = String.raw`(?:\s(?:"[^"]*"|'[^']*'|[^<>"'])*)?`;

/** Markup the serializer stores verbatim, for highlighting it in the editor */
export const HTML_RAW = new RegExp(
	String.raw`<!--[\s\S]*?-->` +
		String.raw`|<([a-zA-Z][a-zA-Z0-9-]*)${HTML_ATTRS}>[\s\S]*?<\/\s*\1\s*>` +
		String.raw`|<\/?[a-zA-Z][a-zA-Z0-9-]*${HTML_ATTRS}\/?>`,
	"gi"
);

/**
 * `code: true` exempts marked text from the markdown serializer's
 * backslash escaping, which would corrupt KirbyTags like
 * (image: my_file.jpg) or bare URLs with underscores.
 */
export const KirbytagRaw = Mark.create({
	name: "kirbytagRaw",
	code: true,
	inclusive: false,

	renderHTML() {
		return ["span", 0];
	},

	renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) =>
		helpers.renderChildren(node.content ?? []),
});

/**
 * Carries anything the schema has no node for. A text block rather than an
 * atom so it stays editable; `code` and the empty mark list keep formatting
 * out by schema instead of by a guard per shortcut
 */
export const RawMarkdownTable = Node.create({
	name: "rawSource",
	group: "block",
	content: "text*",
	marks: "",
	code: true,
	defining: true,

	// Legacy docs stored the source in an attribute
	addAttributes() {
		return { raw: { default: null, rendered: false } };
	},

	parseHTML() {
		return [
			{ tag: "pre[data-raw-source]", preserveWhitespace: "full" },
			{ tag: "pre[data-raw-markdown-table]", preserveWhitespace: "full" },
		];
	},

	renderHTML() {
		return ["pre", { "data-raw-source": "" }, 0];
	},

	renderMarkdown: (node: JSONContent) =>
		(node.content ?? []).map((child) => child.text ?? "").join("") ||
		String(node.attrs?.raw ?? ""),

	addKeyboardShortcuts() {
		const inBlock = () => {
			const { $from, empty } = this.editor.state.selection;
			return empty && $from.parent.type.name === this.name;
		};

		// trailingNode is off for these fields, so a trailing block would
		// otherwise have no way out
		const exit = () => {
			const { state } = this.editor;
			const after = state.selection.$from.after();
			const next = after < state.doc.content.size ? state.doc.nodeAt(after) : null;

			// Not a chain: the selection must resolve against the new document
			if (next?.type.name !== "paragraph") {
				this.editor.commands.insertContentAt(after, { type: "paragraph" });
			}

			return this.editor.commands.focus(after + 1);
		};

		return {
			Enter: () =>
				inBlock() ? this.editor.commands.insertContent("\n") : false,
			"Mod-Enter": () => (inBlock() ? exit() : false),
			ArrowDown: () => {
				if (inBlock() === false) return false;

				const { $from } = this.editor.state.selection;
				const atEnd = $from.parentOffset === $from.parent.content.size;
				const isLast = $from.after() === this.editor.state.doc.content.size;

				return atEnd && isLast ? exit() : false;
			},
		};
	},
});
