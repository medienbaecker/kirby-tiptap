import { Extension, Mark, Node } from "@tiptap/core";
import type {
	AnyExtension,
	JSONContent,
	MarkdownParseHelpers,
	MarkdownRendererHelpers,
	MarkdownToken,
} from "@tiptap/core";
import { OrderedList } from "@tiptap/extension-list";
import { Marked, marked, Tokenizer } from "marked";
import { escapeParens, findKirbyTagRanges } from "../utils/kirbyTags";
import { buildLinkTag, isBareUrlAnchor } from "../utils/inputValidation";

// Kirby renders markdown fields with Parsedown, which has no CommonMark
// flanking rules, so marked alone cannot read back a mark between letters
// like Mitarbeiter**\***innen. These are Parsedown's own patterns.
const PARSEDOWN_STRONG = /^\*\*((?:\\\*|[^*]|\*[^*]*\*)+?)\*\*(?!\*)/;
const PARSEDOWN_EM = /^\*((?:\\\*|[^*]|\*\*[^*]*\*\*)+?)\*(?!\*)/;

/**
 * A manager's default is marked's module singleton, so tokenizers
 * registered there leak into every other manager on the page.
 */
export const isolatedMarked = (): typeof marked =>
	new Marked().use({
		tokenizer: {
			// Without this, anything the block tokenizer declines reaches marked's
			// own HTML rule, which parses it through the DOM and drops what the
			// schema cannot represent
			html: () => undefined,
			emStrong(src, maskedSrc, prevChar) {
				const standard = Tokenizer.prototype.emStrong.call(
					this,
					src,
					maskedSrc,
					prevChar
				);
				if (standard) {
					return standard;
				}

				const strong = PARSEDOWN_STRONG.exec(src);
				if (strong) {
					return {
						type: "strong",
						raw: strong[0],
						text: strong[1],
						tokens: this.lexer.inlineTokens(strong[1]),
					};
				}

				const em = PARSEDOWN_EM.exec(src);
				if (em) {
					return {
						type: "em",
						raw: em[0],
						text: em[1],
						tokens: this.lexer.inlineTokens(em[1]),
					};
				}

				return false;
			},
		},
	}) as unknown as typeof marked;

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

const HTML_ATTRS = String.raw`(?:\s(?:"[^"]*"|'[^']*'|[^<>"'])*)?`;

/** Markup the serializer stores verbatim, for highlighting it in the editor */
export const HTML_RAW = new RegExp(
	String.raw`<!--[\s\S]*?-->` +
		String.raw`|<([a-zA-Z][a-zA-Z0-9-]*)${HTML_ATTRS}>[\s\S]*?<\/\s*\1\s*>` +
		String.raw`|<\/?[a-zA-Z][a-zA-Z0-9-]*${HTML_ATTRS}\/?>`,
	"gi"
);
const HTML_BLOCK_START = /^(?:<!--|<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s|\/?>))/;
const HTML_BR = /^<\/?br\s*\/?>/i;
// Fresh instance, or HTML_RAW's g flag carries lastIndex between calls
const HTML_BLOCK_ELEMENT = new RegExp(`^(?:${HTML_RAW.source})`, "i");
// a becomes a KirbyTag, so it keeps its own handler too
const HTML_INLINE_TAG = new RegExp(
	String.raw`^(?:<!--[\s\S]*?-->` +
		String.raw`|<\/?(?!(?:br|a)\b)[a-zA-Z][a-zA-Z0-9-]*${HTML_ATTRS}\/?>)`,
	"i"
);

/**
 * Keeps a single inline tag as literal text, so the browser's HTML parser
 * cannot turn it into a real node and restructure the line around it.
 * Registered after the <br> and <a href> handlers, which claim theirs first.
 */
export const HtmlInline = Extension.create({
	name: "htmlInline",
	markdownTokenName: "htmlInline",
	markdownTokenizer: {
		name: "htmlInline",
		level: "inline",
		start: (src: string) => {
			for (let at = src.indexOf("<"); at !== -1; at = src.indexOf("<", at + 1)) {
				if (HTML_INLINE_TAG.test(src.slice(at))) {
					return at;
				}
			}
			return -1;
		},
		tokenize: (src: string) => {
			const match = src.match(HTML_INLINE_TAG);
			return match ? { type: "htmlInline", raw: match[0] } : undefined;
		},
	},
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => [
		helpers.createTextNode(String(token.raw ?? "")),
	],
});

// The serializer keeps text verbatim only where it matches HTML_RAW, so a
// wider match gets its trailing prose escaped again on every save. Markup with
// no element to stop at takes the whole block to stay verbatim.
const matchHtmlBlock = (src: string): string | null => {
	if (!HTML_BLOCK_START.test(src)) {
		return null;
	}
	const element = src.match(HTML_BLOCK_ELEMENT);
	if (element) {
		// An element sharing its line goes to the inline tokenizers, which keep
		// the tags raw and leave the rest of the line real markdown
		const after = src.slice(element[0].length);
		return after === "" || after.startsWith("\n") ? element[0] : null;
	}
	const end = src.indexOf("\n\n");
	return end === -1 ? src : src.slice(0, end);
};

/**
 * Keeps a raw HTML block as literal text. Without this the browser's parser
 * and the editor schema get hold of it, and anything with no matching node
 * (an iframe, a script) is dropped and lost on the next save.
 */
export const HtmlBlock = Extension.create({
	name: "htmlBlock",
	markdownTokenName: "htmlBlock",
	markdownTokenizer: {
		name: "htmlBlock",
		level: "block",
		// Never wider than tokenize(), or marked ends the paragraph at a
		// position that then declines to produce a token. Narrower is safe, and
		// a br has to stay inline in the paragraph it interrupts
		start: (src: string) => {
			const candidates = /(?:^|\n)</g;
			let found: RegExpExecArray | null;
			while ((found = candidates.exec(src))) {
				const at = found.index + found[0].length - 1;
				const rest = src.slice(at);
				if (!HTML_BR.test(rest) && matchHtmlBlock(rest)) {
					return at;
				}
			}
			return -1;
		},
		// text, because marked appends a following lone newline to raw
		tokenize: (src: string) => {
			const raw = matchHtmlBlock(src);
			return raw ? { type: "htmlBlock", raw, text: raw } : undefined;
		},
	},
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => [
		helpers.createNode("paragraph", {}, [
			helpers.createTextNode(String(token.text ?? token.raw ?? "")),
		]),
	],
});

// Attribute values may contain > and the href must be its own attribute, or
// data-href fabricates a link and a later > truncates the text
const ATTRS = String.raw`(?:"[^"]*"|'[^']*'|[^>"'])`;
const HTML_ANCHOR = new RegExp(
	`^<a${ATTRS}*?\\shref\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)${ATTRS}*>([\\s\\S]*?)</a\\s*>`,
	"i"
);

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

/**
 * The DOM knows all ~2000 named entities; the table only covers node, where
 * the dev scripts run. An undecoded entity is visible corruption, because
 * Kirby escapes the & when it renders the tag text.
 */
const decodeEntities = (value: string): string => {
	if (value.includes("&") === false) {
		return value;
	}

	if (typeof DOMParser !== "undefined") {
		const doc = new DOMParser().parseFromString(value, "text/html");
		return doc.documentElement.textContent ?? value;
	}

	return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (raw, body: string) => {
		if (body[0] === "#") {
			const code = Number(
				body[1] === "x" || body[1] === "X"
					? `0x${body.slice(2)}`
					: body.slice(1)
			);
			return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : raw;
		}
		return ENTITIES[body.toLowerCase()] ?? raw;
	});
};

// Inline html tokens never reach the token registry, so an inline tokenizer
// is the only hook that beats marked's own tag rule to a raw <a>

export const HtmlLinkToKirbytag = Extension.create({
	name: "htmlLinkToKirbytag",
	markdownTokenName: "htmlLink",
	markdownTokenizer: {
		name: "htmlLink",
		level: "inline",
		start: (src: string) => src.search(/<a[\s>]/i),
		tokenize: (src: string) => {
			const match = src.match(HTML_ANCHOR);
			if (!match) {
				return undefined;
			}
			return {
				type: "htmlLink",
				raw: match[0],
				href: decodeEntities(match[1].replace(/^["']|["']$/g, "")),
				text: decodeEntities(
					match[2].replace(/<\/?[a-zA-Z][^>]*>/g, "")
				)
					.replace(/\s+/g, " ")
					.trim(),
			};
		},
	},
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => {
		const href = String(token.href ?? "");
		const text = String(token.text ?? "");

		if (
			!href ||
			href === "#" ||
			/^(javascript|data):/i.test(href) ||
			isBareUrlAnchor(href, text)
		) {
			return [helpers.createTextNode(text)];
		}

		return [helpers.createTextNode(buildLinkTag(href, text))];
	},
});

const rawBlock = (token: MarkdownToken, helpers: MarkdownParseHelpers) =>
	helpers.createNode("rawMarkdownTable", {
		raw: String(token.raw ?? "").trimEnd(),
	});

const rawInline = (token: MarkdownToken, helpers: MarkdownParseHelpers) =>
	helpers.applyMark("kirbytagRaw", [
		helpers.createTextNode(String(token.raw ?? "")),
	]);

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
	parseMarkdown: rawBlock,
	renderMarkdown: (node: JSONContent) => String(node.attrs?.raw ?? ""),
});

const listTokenize = OrderedList.config.markdownTokenizer?.tokenize;
const DIGIT_LIST_START = /^\s*\d+[.)]\s+/;

/**
 * Kirby's markdown parser knows only digit list markers, but the upstream
 * tokenizer also claims alpha and roman ones. start() never interrupts a
 * paragraph, so prose that opens with a marker stays one block.
 */
export const DigitOnlyOrderedList = OrderedList.extend({
	markdownTokenizer: {
		name: "orderedList",
		level: "block",
		start: () => -1,
		tokenize: (src, tokens, lexer) =>
			DIGIT_LIST_START.test(src)
				? listTokenize?.(src, tokens, lexer)
				: undefined,
	},
});

/**
 * An orderedList already marked false stays false: either the button is
 * off (the list fallback keeps sources raw) or a registry replacement
 * parses its own markdown.
 */
export const digitOnlyOrderedList = (
	config: Record<string, unknown>
): { starterKit: Record<string, unknown>; extensions: AnyExtension[] } =>
	config.orderedList === false
		? { starterKit: config, extensions: [] }
		: {
				starterKit: { ...config, orderedList: false },
				extensions: [DigitOnlyOrderedList],
			};

const RAW_BLOCK_TOKENS = {
	code: "codeBlock",
	blockquote: "blockquote",
	hr: "horizontalRule",
	heading: "heading",
};

const RAW_INLINE_TOKENS = {
	codespan: "code",
	del: "strike",
	strong: "bold",
	em: "italic",
};

/**
 * Constructs whose extension the buttons leave out of the schema would
 * otherwise be deleted (code, hr) or lose their markers (blockquote,
 * emphasis) on the next save. Reusing rawMarkdownTable and kirbytagRaw
 * keeps the PHP serializer unchanged.
 */
export const markdownFallbacks = (
	config: Record<string, unknown>
): AnyExtension[] => {
	const off = (name: string) => config[name] === false;
	const fallbacks: AnyExtension[] = [];

	for (const [token, extension] of Object.entries(RAW_BLOCK_TOKENS)) {
		if (off(extension)) {
			fallbacks.push(
				Extension.create({
					name: `${token}Fallback`,
					markdownTokenName: token,
					parseMarkdown: rawBlock,
				})
			);
		}
	}

	for (const [token, extension] of Object.entries(RAW_INLINE_TOKENS)) {
		if (off(extension)) {
			fallbacks.push(
				Extension.create({
					name: `${token}Fallback`,
					markdownTokenName: token,
					parseMarkdown: rawInline,
				})
			);
		}
	}

	if (off("bulletList") || off("orderedList")) {
		fallbacks.push(
			Extension.create({
				name: "listFallback",
				markdownTokenName: "list",
				// [] declines the token, deferring to the loaded list extension
				parseMarkdown: (
					token: MarkdownToken,
					helpers: MarkdownParseHelpers
				) =>
					(token.ordered ? off("orderedList") : off("bulletList"))
						? rawBlock(token, helpers)
						: [],
			})
		);
	}

	return fallbacks;
};

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

		return [
			helpers.createTextNode(
				buildLinkTag(href, text, {
					title: token.title
						? escapeParens(String(token.title))
						: undefined,
				})
			),
		];
	},
});

// No button can add an image node, so the source is the only representation
export const ImageRaw = Extension.create({
	name: "imageRaw",
	markdownTokenName: "image",
	parseMarkdown: rawInline,
});

// Upstream promotes a lone image to a block node, where the raw mark is lost
export const LoneImageParagraph = Extension.create({
	name: "loneImageParagraph",
	// Above Paragraph's own 1000, or its promotion runs first
	priority: 1001,
	markdownTokenName: "paragraph",
	// [] declines the token, deferring to the paragraph extension
	parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => {
		const tokens = token.tokens ?? [];
		return tokens.length === 1 && tokens[0].type === "image"
			? helpers.createNode("paragraph", undefined, helpers.parseInline(tokens))
			: [];
	},
});

const CODESPAN = /^(`+)([^]*?)\1(?!`)/;
// The serializer always writes one backtick, which cannot delimit either one
const UNSAFE_CODESPAN = /`|^\s*$/;

// Claimed at tokenizer level, not by token name: an inline handler is the only
// one consulted, so a name-based one could not hand safe spans back
export const UnsafeCodespanRaw = Extension.create({
	name: "unsafeCodespanRaw",
	markdownTokenName: "unsafeCodespan",
	markdownTokenizer: {
		name: "unsafeCodespan",
		level: "inline",
		start: (src: string) => src.indexOf("`"),
		tokenize: (src: string) => {
			const match = CODESPAN.exec(src);
			if (match === null) {
				return undefined;
			}
			const body = match[2];
			const text =
				body.startsWith(" ") && body.endsWith(" ") && body.trim() !== ""
					? body.slice(1, -1)
					: body;
			return UNSAFE_CODESPAN.test(text)
				? { type: "unsafeCodespan", raw: match[0], text }
				: undefined;
		},
	},
	parseMarkdown: rawInline,
});

// HtmlInline comes after HtmlBreak and HtmlLinkToKirbytag: those claim <br>
// and <a href>, and it keeps every remaining tag literal
export const markdownParseExtensions: AnyExtension[] = [
	HtmlBlock,
	HtmlBreak,
	HtmlLinkToKirbytag,
	HtmlInline,
	KirbytagText,
	LinkToKirbytag,
	ImageRaw,
	LoneImageParagraph,
	UnsafeCodespanRaw,
];
