import type { EditorView } from "@tiptap/pm/view";
import type {
	ParsedKirbyTag,
	NavigationTarget,
	ResolvedKirbyTag,
	EndpointsConfig,
	KirbytagsMap,
	TiptapDocument,
	TiptapNode,
} from "../types";
import type { Panel } from "kirby-types";

const escapeRegex = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Regex source matching the next attribute boundary in a tag string.
 * When the tag's registered attributes are known, only those names split
 * fields — mirroring PHP's KirbyTag::parse(), which also treats the tag
 * type itself as an attribute. Falls back to any word otherwise.
 */
const fieldBoundarySource = (tagType: string, attrs?: string[]): string => {
	const names = attrs?.length
		? [tagType, ...attrs].map(escapeRegex).join("|")
		: String.raw`\w+`;
	return String.raw`\s+(${names}):(?!\/\/)\s*`;
};

/**
 * Parse a Kirby‐tag string like "(tag: value attr1: value1 attr2: value2)"
 * into an object { type, value, attr1, attr2, ... }
 * Pass the field's kirbytags map (tag name => registered attribute names)
 * so attribute values containing colons don't split on unregistered words.
 */
export const parseKirbyTag = (
	tagString: string,
	tags?: KirbytagsMap
): ParsedKirbyTag => {
	// Get tag type
	const typeMatch = tagString.match(/^\((\w+):/);
	const tagType = typeMatch ? typeMatch[1].toLowerCase() : "";
	const result: ParsedKirbyTag = {
		// Store the tag type in a property that won't be used as an attribute
		_type: tagType,
	};

	const fieldPattern = new RegExp(
		fieldBoundarySource(tagType, tags?.[tagType]),
		"gi"
	);

	// Find all field positions
	const matches = [...tagString.matchAll(fieldPattern)];

	// Handle the main tag value
	const firstFieldPos =
		matches.length > 0 ? matches[0].index! : tagString.length - 1;
	const typeColonPos = tagString.indexOf(":");
	const mainValue = tagString.substring(typeColonPos + 1, firstFieldPos).trim();

	// Store the main value with an appropriate key based on tag type
	if (tagType === "link" || tagType === "email" || tagType === "tel") {
		result.href = mainValue;
	} else if (tagType === "image" || tagType === "file" || tagType === "video") {
		result.uuid = mainValue;
	} else {
		result.value = mainValue; // Generic fallback
	}

	// Process each field
	for (let i = 0; i < matches.length; i++) {
		const match = matches[i];
		const fieldName = match[1].toLowerCase();
		const startPos = match.index! + match[0].length;
		const endPos =
			i < matches.length - 1 ? matches[i + 1].index! : tagString.length - 1;

		// Skip the field if it's the same as the tag type
		if (fieldName === tagType) continue;

		result[fieldName] = tagString.substring(startPos, endPos).trim();
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

	// Selection is a complete tag
	if (matches(selectedText) && selectedText.endsWith(")")) {
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

// Regex for balanced parentheses parsing in KirbyTags
// Group 1: tag starts like "(image:" or "(tel:"
// Group 2: opening parentheses "("
// Group 3: closing parentheses ")"
const KIRBYTAG_COMPONENT_REGEX = /(\([a-z0-9_-]+:)|(\()|(\))/gi;

/**
 * Finds all KirbyTag positions in a text string using balanced parentheses parsing.
 * Returns an array of [start, end] tuples.
 */
export const findKirbyTagRanges = (text: string): [number, number][] => {
	const positions: [number, number][] = [];

	// Reset regex state
	KIRBYTAG_COMPONENT_REGEX.lastIndex = 0;

	let level = 0;
	let inTag = false;
	let tagStart = -1;
	let match: RegExpExecArray | null;

	while ((match = KIRBYTAG_COMPONENT_REGEX.exec(text))) {
		if (!inTag && match[1]) {
			// Tag start: begin tracking this KirbyTag
			inTag = true;
			level = 1;
			tagStart = match.index;
		} else if (inTag && (match[1] || match[2])) {
			// Opening parenthesis: increase nesting level
			level += 1;
		} else if (inTag && match[3]) {
			// Closing parenthesis: decrease nesting level
			level -= 1;

			if (level === 0) {
				// All parentheses balanced: complete the KirbyTag
				const start = tagStart;
				const end = match.index + match[0].length;
				positions.push([start, end]);

				inTag = false;
				tagStart = -1;
			}
		}
	}

	return positions;
};

const BARE_URL_REGEX = /https?:\/\/[^\s<>]+/g;

/**
 * Wraps KirbyTag and bare URL ranges in the kirbytagRaw mark so the
 * markdown serializer emits them verbatim: Kirby parses tags before any
 * markdown unescaping, so escaped metacharacters would end up in
 * hrefs/srcs, and escaped bare URLs get corrupted by the autolinker.
 */
export const protectKirbyTags = (
	doc: TiptapDocument,
	tags?: KirbytagsMap
): TiptapDocument => {
	const registered = tags ? new Set(Object.keys(tags)) : null;

	const processText = (node: TiptapNode): TiptapNode[] => {
		const text = node.text || "";
		if (
			node.marks?.some(
				(mark) => mark.type === "code" || mark.type === "kirbytagRaw"
			)
		) {
			return [node];
		}

		const ranges = findKirbyTagRanges(text).filter(([start, end]) => {
			if (!registered) return true;
			const { _type } = parseKirbyTag(text.substring(start, end), tags);
			return _type !== undefined && registered.has(_type);
		});

		// Bare URLs outside tag ranges, without trailing punctuation
		BARE_URL_REGEX.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = BARE_URL_REGEX.exec(text))) {
			const start = match.index;
			const end = start + match[0].replace(/[.,;:!?'"]+$/, "").length;
			if (!ranges.some(([s, e]) => start < e && end > s)) {
				ranges.push([start, end]);
			}
		}
		ranges.sort((a, b) => a[0] - b[0]);

		if (ranges.length === 0) {
			return [node];
		}

		const result: TiptapNode[] = [];
		let cursor = 0;
		for (const [start, end] of ranges) {
			if (start > cursor) {
				result.push({ ...node, text: text.slice(cursor, start) });
			}
			result.push({
				type: "text",
				text: text.slice(start, end),
				marks: [...(node.marks ?? []), { type: "kirbytagRaw" }],
			});
			cursor = end;
		}
		if (cursor < text.length) {
			result.push({ ...node, text: text.slice(cursor) });
		}
		return result;
	};

	const walk = (node: TiptapNode): TiptapNode => {
		if (!node.content || node.type === "codeBlock") {
			return node;
		}
		return {
			...node,
			content: node.content
				.map(walk)
				.flatMap((child) =>
					child.type === "text" && child.text ? processText(child) : [child]
				),
		};
	};

	return walk(doc as unknown as TiptapNode) as unknown as TiptapDocument;
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
	const typeMatch = tagString.match(/^\((\w+):\s*/);
	if (!typeMatch) return null;

	const type = typeMatch[1].toLowerCase();
	const valueStart = typeMatch[0].length;

	const fieldPattern = new RegExp(fieldBoundarySource(type, tags?.[type]), "gi");
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

const LINK_TAG_PREFIXES = ["(link:", "(email:", "(tel:"] as const;

/**
 * Checks if text is a link-type KirbyTag (link, email, or tel)
 */
export const isLinkTag = (text: string | null): boolean => {
	if (!text) return false;
	return LINK_TAG_PREFIXES.some((prefix) => text.startsWith(prefix));
};

