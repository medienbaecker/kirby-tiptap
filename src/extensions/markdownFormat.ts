import { Extension, Mark, Node } from "@tiptap/core";
import type {
	JSONContent,
	MarkdownParseHelpers,
	MarkdownRendererHelpers,
	MarkdownToken,
} from "@tiptap/core";
import { findKirbyTagRanges } from "../utils/kirbyTags";

// Kirby reads unescaped parens as the tag boundary
const escapeParens = (value: string): string =>
	value.replace(/[()]/g, "\\$&");

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
 * Tokenizes KirbyTags ahead of every other inline rule: their content
 * must never parse as markdown (autolinking inside a tag double-wraps
 * it, emphasis splits it across text nodes).
 */
export const KirbytagText = Extension.create({
	name: "kirbytagText",
	markdownTokenName: "kirbytag",
	markdownTokenizer: {
		name: "kirbytag",
		level: "inline",
		start: (src: string) => src.search(/\([a-z0-9_-]+:/i),
		tokenize: (src: string) => {
			const range = findKirbyTagRanges(src)[0];
			if (!range || range[0] !== 0) {
				return undefined;
			}
			const raw = src.slice(0, range[1]);
			return { type: "kirbytag", raw, text: raw };
		},
	},
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => [
		helpers.createTextNode(String(token.text ?? token.raw ?? "")),
	],
});

/**
 * Parses literal <br> into a hardBreak: the serializer emits <br> for
 * breaks markdown cannot express (in headings, consecutive breaks), so
 * the reparse must not leave it as escaped text.
 */
export const HtmlBreak = Extension.create({
	name: "htmlBreak",
	markdownTokenName: "htmlBreak",
	markdownTokenizer: {
		name: "htmlBreak",
		level: "inline",
		start: (src: string) => src.search(/<br\s*\/?>/i),
		tokenize: (src: string) => {
			const match = src.match(/^<br\s*\/?>/i);
			if (!match) {
				return undefined;
			}
			return { type: "htmlBreak", raw: match[0] };
		},
	},
	parseMarkdown: (_token: MarkdownToken, helpers: MarkdownParseHelpers) => [
		helpers.createNode("hardBreak"),
	],
});

/**
 * Keeps GFM tables from being silently deleted on save: the schema has
 * no table extension, so the source is stored verbatim and re-emitted
 * on serialize. Kirby needs markdown.extra to render tables.
 */
export const RawMarkdownTable = Node.create({
	name: "rawMarkdownTable",
	group: "block",
	atom: true,

	addAttributes() {
		return { raw: { default: "" } };
	},

	parseHTML() {
		return [
			{
				tag: "pre[data-raw-markdown-table]",
				getAttrs: (element) => ({ raw: element.textContent ?? "" }),
			},
		];
	},

	renderHTML({ node }) {
		return [
			"pre",
			{ "data-raw-markdown-table": "" },
			String(node.attrs.raw),
		];
	},

	markdownTokenName: "table",
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) =>
		helpers.createNode("rawMarkdownTable", {
			raw: String(token.raw ?? "").trimEnd(),
		}),
	renderMarkdown: (node: JSONContent) => String(node.attrs?.raw ?? ""),
});

/**
 * Converts markdown links to KirbyTags on parse. Without this, hrefs are
 * silently dropped because the Link mark is not in the schema. marked
 * resolves reference definitions and autolinks first, so every syntax
 * arrives here as one token shape with a final href.
 */
export const LinkToKirbytag = Extension.create({
	name: "linkToKirbytag",
	markdownTokenName: "link",
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => {
		const href = String(token.href ?? "");
		const text = String(token.text ?? "");
		const isEmail = href.startsWith("mailto:");
		const value = isEmail ? href.slice(7) : href;

		// Bare URLs and autolinks keep their source form: a (link:) tag
		// would change the rendered anchor text (Html::link shortens URL
		// texts), and escaping the plain text would corrupt the href
		if (!text || text === value || text === href) {
			return helpers.applyMark("kirbytagRaw", [
				helpers.createTextNode(String(token.raw ?? text ?? href)),
			]);
		}

		let tag = `(${isEmail ? "email" : "link"}: ${value} text: ${escapeParens(text)}`;
		if (token.title) {
			tag += ` title: ${escapeParens(String(token.title))}`;
		}
		tag += ")";

		return [helpers.createTextNode(tag)];
	},
});
