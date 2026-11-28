import type { Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type {
	ParsedKirbyTag,
	NavigationTarget,
	ResolvedKirbyTag,
	EndpointsConfig,
	KirbytagsMap,
} from "../types";
import type { Panel } from "kirby-types";

const escapeRegex = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Writer stores /@/page/<uuid>, but only the scheme form resolves inline:
// the (link:) tag gates on Uuid::is(), which does not match the permalink path
const PERMALINK = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?@\/(page|file)\//i;

export const normalizeHref = (href: string): string =>
	href.replace(PERMALINK, "$1://");

/**
 * Matches the attribute names that split a KirbyTag, the way Kirby's
 * KirbyTag::parse() does: the tag type and its registered attributes,
 * anywhere in the tag, unless a UUID scheme follows. Without the field's
 * attribute map, any word after whitespace splits.
 */
const registered = (type: string, tags: KirbytagsMap): string[] =>
	Object.prototype.hasOwnProperty.call(tags, type) ? tags[type] : [];

const trimLikePhp = (value: string): string =>
	value.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, "");

export const attributePattern = (type: string, tags?: KirbytagsMap): RegExp => {
	if (!tags) return /(?<!\S)(\w+):(?!\/\/)/gi;

	const names = [type, ...registered(type, tags)].map(escapeRegex).join("|");
	return new RegExp(String.raw`(?!(?:site|page|file|user):\/\/)(${names}):`, "gi");
};

const tagBody = (tagString: string): string => {
	const body = trimLikePhp(tagString.replace(/^\(+/, ""));
	return body.endsWith(")") ? body.slice(0, -1) : body;
};

/**
 * Parse a Kirby‐tag string like "(tag: value attr1: value1 attr2: value2)"
 * into an object { type, value, attr1, attr2, ... }, splitting it exactly
 * like Kirby's KirbyTag::parse(). Pass the field's kirbytagAttributes map
 * (tag name => registered attribute names).
 */
export const parseKirbyTag = (
	tagString: string,
	tags?: KirbytagsMap
): ParsedKirbyTag => {
	const body = tagBody(tagString);
	const colon = body.indexOf(":");
	const tagType = trimLikePhp(body.slice(0, colon > 0 ? colon : undefined)).toLowerCase();
	const result: ParsedKirbyTag = { _type: tagType };

	const parts = body.split(attributePattern(tagType, tags)).filter((part) => part);
	const attributes = new Map<string, string>();
	for (let index = 0; index < parts.length; index += 2) {
		attributes.set(parts[index], trimLikePhp(parts[index + 1] ?? ""));
	}

	const [mainValue = ""] = attributes.values();
	attributes.delete([...attributes.keys()][0]);

	if (tagType === "link" || tagType === "email" || tagType === "tel") {
		result.href = mainValue;
	} else if (tagType === "image" || tagType === "file" || tagType === "video") {
		result.uuid = mainValue;
	} else {
		result.value = mainValue;
	}

	const known = tags ? registered(tagType, tags) : null;
	for (const [name, value] of attributes) {
		const key = name.toLowerCase();
		if (key !== tagType && (!known || known.includes(key))) result[key] = value;
	}

	return result;
};

/**
 * Generates a Kirby tag string from an object of attributes
 */
export const generateKirbyTag = (
	type: string,
	mainValue: string,
	attrs: Record<string, unknown> = {}
): string => {
	// Start with the basic tag
	let tag = `(${type}: ${mainValue}`;

	// Add extra attributes, filtering out empty values
	Object.entries(attrs)
		.filter(([, v]) => {
			if (v === "" || v === false || v == null) return false;
			if (Array.isArray(v) && v.length === 0) return false;
			return true;
		})
		.forEach(([k, v]) => {
			tag += ` ${k}: ${Array.isArray(v) ? v.join(" ") : v}`;
		});

	// Close the tag
	tag += ")";

	return tag;
};

/**
 * Resolves a domAtPos result to the most specific child node.
 * When the cursor sits at a boundary between two inline decoration spans,
 * ProseMirror returns the parent element with an offset between children.
 * This drills into the child at that offset so findParentWithClass can find it.
 */
export const resolveNodeAtPos = (node: Node, offset: number): Node => {
	if (node.nodeType === 1 && node.childNodes.length > 0) {
		return node.childNodes[Math.min(offset, node.childNodes.length - 1)];
	}
	return node;
};

/**
 * Finds a KirbyTag group at a given editor position.
 * Combines domAtPos → resolveNodeAtPos → findParentWithClass into a single call.
 */
export const findTagAtPos = (
	view: EditorView,
	pos: number,
	className: string
): KirbyTagGroup | null => {
	const { node, offset } = view.domAtPos(pos);
	const result = findParentWithClass(resolveNodeAtPos(node, offset), className);
	if (result) return result;

	// At decoration boundaries, domAtPos returns the parent element with offset
	// pointing to the next child after the decoration. Check the preceding child
	// to catch the cursor sitting right after a decorated span.
	if (node.nodeType === 1 && offset > 0) {
		return findParentWithClass(node.childNodes[offset - 1], className);
	}
	return null;
};

export interface KirbyTagGroup {
	textContent: string;
	firstElement: Element;
	lastElement: Element;
	childNodes: NodeListOf<ChildNode>;
}

export interface TagEditingContext {
	isEditing: boolean;
	tagText?: string;
	replaceRange?: { from: number; to: number };
	selectedText?: string;
}

interface EditorLike {
	state: { doc: any; selection: { from: number; to: number; empty: boolean } };
	view: EditorView;
	isFocused?: boolean;
}

const tagGroupRange = (view: EditorView, group: KirbyTagGroup) => ({
	from: view.posAtDOM(group.firstElement, 0),
	to: view.posAtDOM(group.lastElement, group.childNodes.length),
});

/**
 * Determine whether the current selection sits inside or overlaps a
 * KirbyTag matched by `matches`, returning the tag's text and document
 * range for editing/replacing. Shared by the link and file buttons.
 */
export const getTagEditingContext = (
	editor: EditorLike,
	matches: (text: string | null) => boolean
): TagEditingContext => {
	const { state, view } = editor;
	const { from, to, empty } = state.selection;

	if (empty) {
		const group = findTagAtPos(view, from, "kirbytag");
		if (group && matches(group.textContent)) {
			return {
				isEditing: true,
				tagText: group.textContent,
				replaceRange: tagGroupRange(view, group),
			};
		}
		return { isEditing: false };
	}

	const selectedText = state.doc.textBetween(from, to).trim();

	const tags = findKirbyTagRanges(selectedText).length;
	if (tags > 1) return { isEditing: false, selectedText };

	// Selection is a complete tag
	if (matches(selectedText) && selectedText.endsWith(")") && tags === 1) {
		return { isEditing: true, tagText: selectedText, replaceRange: { from, to } };
	}

	// Selection intersects a tag at either end
	for (const pos of [from, to]) {
		const group = findTagAtPos(view, pos, "kirbytag");
		if (group && matches(group.textContent)) {
			return {
				isEditing: true,
				tagText: group.textContent,
				replaceRange: tagGroupRange(view, group),
			};
		}
	}

	return { isEditing: false, selectedText };
};

/**
 * activeCheck shared by the link and file buttons: whether the selection
 * is in or on a tag matched by `matches`.
 */
export const isTagActive = (
	editor: EditorLike,
	matches: (text: string | null) => boolean
): boolean => {
	if (!editor.isFocused) return false;
	return getTagEditingContext(editor, matches).isEditing;
};

/**
 * Traverses up the DOM tree to find an element with the specified class.
 * When ProseMirror splits a decoration into adjacent sibling spans (due to
 * overlapping decorations), this collects all contiguous siblings with the
 * same class and returns a group with the combined text and boundary elements.
 */
export const findParentWithClass = (
	node: Node,
	className: string
): KirbyTagGroup | null => {
	let cur: Node | null = node.nodeType === 3 ? node.parentNode : node;
	while (cur) {
		if ((cur as Element).classList?.contains(className)) {
			const el = cur as Element;
			const tagId = (el as HTMLElement).dataset?.tagId;

			let first = el;
			while (
				first.previousSibling === first.previousElementSibling &&
				first.previousElementSibling?.classList?.contains(className) &&
				(first.previousElementSibling as HTMLElement)?.dataset?.tagId === tagId
			) {
				first = first.previousElementSibling;
			}

			let last = el;
			while (
				last.nextSibling === last.nextElementSibling &&
				last.nextElementSibling?.classList?.contains(className) &&
				(last.nextElementSibling as HTMLElement)?.dataset?.tagId === tagId
			) {
				last = last.nextElementSibling;
			}

			let text = "";
			let sibling: Element | null = first;
			while (sibling) {
				text += sibling.textContent || "";
				if (sibling === last) break;
				sibling = sibling.nextElementSibling;
			}

			return {
				textContent: text,
				firstElement: first,
				lastElement: last,
				childNodes: last.childNodes,
			};
		}
		cur = cur.parentNode;
	}
	return null;
};

/**
 * Kirby has no escape for parentheses: one without its partner ends a
 * KirbyTag early or keeps it from closing
 */
export const hasUnpairedParens = (value: string): boolean => {
	let level = 0;
	for (const char of value) {
		if (char === "(") level++;
		else if (char === ")" && --level < 0) return true;
	}
	return level !== 0;
};

/**
 * Whether Kirby would read a value differently once it is written into a
 * KirbyTag of the given type: it has no escape for parentheses or
 * attribute names, and an empty line splits a Markdown paragraph
 */
export const isUnsavable = (
	type: string,
	value: string,
	tags?: KirbytagsMap,
	format?: "json" | "markdown"
): boolean =>
	hasUnpairedParens(value) ||
	attributePattern(type, tags).test(value) ||
	(format === "markdown" && /\n\s*\n/.test(value));

/**
 * Kirby's own message for an invalid field, with the field's label
 */
export const invalidField = (name: string, fields: Record<string, { label?: string }>): string =>
	`${fields[name]?.label ?? name}: ${window.panel.t("field.invalid")}`;

/**
 * The warning for the first value that can't be saved in a KirbyTag
 * as it is, or null when all of them can
 */
export const unsavableValue = (
	type: string,
	values: Record<string, unknown>,
	fields: Record<string, { label?: string }>,
	tags?: KirbytagsMap,
	format?: "json" | "markdown"
): string | null => {
	for (const [name, value] of Object.entries(values)) {
		const text = Array.isArray(value) ? value.join(" ") : value;
		if (typeof text === "string" && isUnsavable(type, text, tags, format)) {
			return invalidField(name, fields);
		}
	}
	return null;
};

const TAG_START = /\([a-z0-9_-]+:/iy;

const balancedEnd = (text: string, start: number): number => {
	let level = 0;
	for (let index = start; index < text.length; index++) {
		if (text[index] === "(") level++;
		else if (text[index] === ")" && --level === 0) return index + 1;
	}
	return -1;
};

/**
 * Finds all KirbyTag positions in a text string the way Kirby's
 * KirbyTags::parse() does: a tag runs to its balanced closing parenthesis,
 * and a tag start that never closes is skipped. Backslashes escape nothing.
 * Returns an array of [start, end] tuples.
 */
export const findKirbyTagRanges = (text: string): [number, number][] => {
	const positions: [number, number][] = [];
	let start = text.indexOf("(");

	while (start !== -1) {
		TAG_START.lastIndex = start;
		const end = TAG_START.test(text) ? balancedEnd(text, start) : -1;

		if (end === -1) {
			start = text.indexOf("(", start + 1);
		} else {
			positions.push([start, end]);
			start = text.indexOf("(", end);
		}
	}

	return positions;
};

/**
 * Reader-visible text: each KirbyTag is replaced by what it renders as
 * text — its `text:` attribute if present, otherwise the main value for
 * link-like tags, nothing for media tags. Approximates the server-side
 * length measure (rendered HTML with tags stripped) so the counter and
 * min/maxlength validation agree.
 */
export const getVisibleText = (text: string, tags?: KirbytagsMap): string => {
	const ranges = findKirbyTagRanges(text);
	if (ranges.length === 0) return text;

	let out = "";
	let cursor = 0;
	for (const [start, end] of ranges) {
		out += text.substring(cursor, start);
		const parsed = parseKirbyTag(text.substring(start, end), tags);
		if (typeof parsed.text === "string" && parsed.text) {
			out += parsed.text;
		} else if (["link", "email", "tel"].includes(parsed._type)) {
			out += parsed.href ?? "";
		}
		cursor = end;
	}
	return out + text.substring(cursor);
};

/**
 * The text a reader sees, counted like the server's min/maxlength check:
 * one character per block and line break, KirbyTags as their visible text
 */
export const getVisibleDocText = (doc: ProseMirrorNode, tags?: KirbytagsMap): string => {
	const blocks: string[] = [];

	doc.descendants((node) => {
		if (!node.isTextblock) return true;

		let text = "";
		node.forEach((child) => {
			if (child.isText) text += child.text;
			else if (child.type.name === "hardBreak") text += "\n";
			else if (child.type.name === "kirbytag") text += child.attrs.text;
		});
		const visible = getVisibleText(text, tags);
		if (visible !== "") blocks.push(visible);
		return false;
	});

	return blocks.join("\n").trim();
};

/**
 * Extract navigation target from a parsed KirbyTag.
 * Returns null for non-navigable tags (email, tel).
 */
export const getNavigationTarget = (
	parsed: ParsedKirbyTag
): NavigationTarget | null => {
	const type = parsed._type;

	if (type === "email" || type === "tel") {
		return null;
	}

	if (type === "link") {
		const href = parsed.href || "";
		if (!href) return null;
		if (href.startsWith("http://") || href.startsWith("https://")) {
			return { reference: href, type: "external" };
		}
		if (
			href.startsWith("mailto:") ||
			href.startsWith("tel:") ||
			href.startsWith("#")
		) {
			return null;
		}
		return { reference: href, type: "link" };
	}

	if (type === "image" || type === "file" || type === "video") {
		const ref = parsed.uuid || parsed.value || "";
		return ref ? { reference: ref, type } : null;
	}

	// Unknown tag type with a value — try to navigate
	const ref = parsed.value || parsed.href || parsed.uuid || "";
	return ref ? { reference: ref, type } : null;
};

/**
 * Navigate to a KirbyTag reference.
 * External URLs open in a new tab; internal refs resolve via API then open in Panel.
 */
export const getFieldApiPath = (endpoints: EndpointsConfig): string =>
	endpoints.field.startsWith("/api/")
		? endpoints.field.substring(4)
		: endpoints.field;

export const navigateToKirbyTag = async (
	target: NavigationTarget,
	endpoints: EndpointsConfig | undefined,
	panel: Panel
): Promise<void> => {
	if (target.type === "external") {
		window.open(target.reference, "_blank", "noopener,noreferrer");
		return;
	}

	if (!endpoints) return;

	try {
		const apiUrl = `${getFieldApiPath(endpoints)}/resolve-kirbytag`;

		const response = await panel.api.post<ResolvedKirbyTag>(apiUrl, {
			reference: target.reference,
			type: target.type,
		});

		if (response.type === "external" && response.url) {
			window.open(response.url, "_blank", "noopener,noreferrer");
		} else if (response.panelUrl) {
			panel.open(response.panelUrl);
		}
	} catch {
		const wp = window as unknown as {
			panel: Panel & { $t: (key: string) => string };
		};
		panel.notification.error(wp.panel.$t("tiptap.navigate.error"));
	}
};

/**
 * Find the [start, end] offset of the main reference value within a KirbyTag string.
 * For example, in "(link: page://abc text: foo)" returns the position of "page://abc".
 * Returns null if no reference range can be determined.
 */
export const findReferenceRange = (
	tagString: string,
	tags?: KirbytagsMap
): [number, number] | null => {
	const type = tagName(tagString);
	if (!type) return null;

	const valueStart = tagString.indexOf(":") + 1;

	const fieldPattern = attributePattern(type, tags);
	fieldPattern.lastIndex = valueStart;
	const nextField = fieldPattern.exec(tagString);

	const valueEnd = nextField ? nextField.index : tagString.length - 1;

	// Trim the value to get exact boundaries
	const rawValue = tagString.substring(valueStart, valueEnd);
	const trimmedStart =
		valueStart + (rawValue.length - rawValue.trimStart().length);
	const trimmedEnd = valueEnd - (rawValue.length - rawValue.trimEnd().length);

	if (trimmedStart >= trimmedEnd) return null;

	// Only return range for navigable reference types
	if (type === "email" || type === "tel") return null;
	if (type === "link") {
		const value = tagString.substring(trimmedStart, trimmedEnd);
		if (
			value.startsWith("mailto:") ||
			value.startsWith("tel:") ||
			value.startsWith("#")
		) {
			return null;
		}
	}

	return [trimmedStart, trimmedEnd];
};

/**
 * Batch-check whether KirbyTag references are resolvable via the Panel API.
 * Returns a map of reference string → boolean.
 */
export const checkKirbyTagReferences = async (
	references: Array<{ reference: string; type: string }>,
	endpoints: EndpointsConfig,
	panel: Panel
): Promise<Record<string, boolean>> => {
	const response = await panel.api.post<{ results: Record<string, boolean> }>(
		`${getFieldApiPath(endpoints)}/check-kirbytags`,
		{ references }
	);

	return response.results;
};

/**
 * The lowercased name of a KirbyTag, empty for other text
 */
export const tagName = (text: string): string =>
	text.match(/^\(([a-z0-9_-]+):/i)?.[1].toLowerCase() ?? "";

/**
 * Checks if text is a media KirbyTag (image, file, or video)
 */
export const isFileTag = (text: string | null): boolean =>
	/^\((image|file|video):/i.test(text ?? "");

const LINK_TAG_PREFIXES = ["(link:", "(email:", "(tel:"] as const;

/**
 * Checks if text is a link-type KirbyTag (link, email, or tel)
 */
export const isLinkTag = (text: string | null): boolean => {
	if (!text) return false;
	const lower = text.toLowerCase();
	return LINK_TAG_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

/**
 * Checks if a KirbyTag shows as a pill: file and link tags, and the listed ones
 */
export const isPillTag = (text: string, tags: string[]): boolean =>
	isFileTag(text) || isLinkTag(text) || tags.some((tag) => tag.toLowerCase() === tagName(text));

/**
 * Replaces a tag the dialogs edited (unless nothing changed); in fields with pills the pill stays selected
 */
export const replaceTag = (
	editor: Editor,
	range: { from: number; to: number },
	content: string
): void => {
	if (editor.state.doc.textBetween(range.from, range.to) !== content) {
		editor.chain().focus().deleteRange(range).insertContent({ type: "text", text: content }).run();
	} else {
		editor.commands.focus();
	}

	if (editor.state.doc.nodeAt(range.from)?.type.name === "kirbytag") {
		editor.commands.setNodeSelection(range.from);
	}
};

/**
 * Helper to process KirbyTag through API for UUID conversion
 */
export async function processKirbyTagApi(
	kirbyTag: string,
	endpoints: EndpointsConfig | null | undefined,
	panel: Panel | null
): Promise<string> {
	if (!endpoints || !panel || !kirbyTag) {
		return kirbyTag;
	}

	try {
		// getFieldApiPath strips the /api prefix, which panel.api.post() re-adds.
		const apiUrl = `${getFieldApiPath(endpoints)}/process-kirbytag`;

		const response = await panel.api.post<{ text?: string }>(apiUrl, { kirbyTag });
		return response.text || kirbyTag;
	} catch {
		return kirbyTag;
	}
}
