import { Extension, Mark } from "@tiptap/core";
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

		let tag = `(${isEmail ? "email" : "link"}: ${value}`;
		if (text && text !== value && text !== href) {
			tag += ` text: ${escapeParens(text)}`;
		}
		if (token.title) {
			tag += ` title: ${escapeParens(String(token.title))}`;
		}
		tag += ")";

		return [helpers.createTextNode(tag)];
	},
});
