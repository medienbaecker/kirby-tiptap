import type { ParsedKirbyTag, NavigationTarget, ResolvedKirbyTag, EndpointsConfig } from "../types";
import type { Panel } from "kirby-types";

/**
 * Parse a Kirby‐tag string like "(tag: value attr1: value1 attr2: value2)"
 * into an object { type, value, attr1, attr2, ... }
 */
export const parseKirbyTag = (tagString: string): ParsedKirbyTag => {
	// Get tag type
	const typeMatch = tagString.match(/^\((\w+):/);
	const tagType = typeMatch ? typeMatch[1] : "";
	const result: ParsedKirbyTag = {
		// Store the tag type in a property that won't be used as an attribute
		_type: tagType,
	};

	const fieldPattern = /\s+(\w+):(?!\/\/)\s*/g;

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
		const fieldName = match[1];
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

export interface KirbyTagGroup {
	textContent: string;
	firstElement: Element;
	lastElement: Element;
	childNodes: NodeListOf<ChildNode>;
}

/**
 * Traverses up the DOM tree to find an element with the specified class.
 * When ProseMirror splits a decoration into adjacent sibling spans (due to
 * overlapping decorations), this collects all contiguous siblings with the
 * same class and returns a group with the combined text and boundary elements.
 */
export const findParentWithClass = (node: Node, className: string): KirbyTagGroup | null => {
	let cur: Node | null = node.nodeType === 3 ? node.parentNode : node;
	while (cur) {
		if ((cur as Element).classList?.contains(className)) {
			const el = cur as Element;

			let first = el;
			while (first.previousElementSibling?.classList?.contains(className)) {
				first = first.previousElementSibling;
			}

			let last = el;
			while (last.nextElementSibling?.classList?.contains(className)) {
				last = last.nextElementSibling;
			}

			let text = '';
			let sibling: Element | null = first;
			while (sibling) {
				text += sibling.textContent || '';
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

/**
 * Extract navigation target from a parsed KirbyTag.
 * Returns null for non-navigable tags (email, tel).
 */
export const getNavigationTarget = (parsed: ParsedKirbyTag): NavigationTarget | null => {
	const type = parsed._type;

	if (type === 'email' || type === 'tel') {
		return null;
	}

	if (type === 'link') {
		const href = parsed.href || '';
		if (!href) return null;
		if (href.startsWith('http://') || href.startsWith('https://')) {
			return { reference: href, type: 'external' };
		}
		if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
			return null;
		}
		return { reference: href, type: 'link' };
	}

	if (type === 'image' || type === 'file' || type === 'video') {
		const ref = parsed.uuid || parsed.value || '';
		return ref ? { reference: ref, type } : null;
	}

	// Unknown tag type with a value — try to navigate
	const ref = parsed.value || parsed.href || parsed.uuid || '';
	return ref ? { reference: ref, type } : null;
};

/**
 * Navigate to a KirbyTag reference.
 * External URLs open in a new tab; internal refs resolve via API then open in Panel.
 */
export const navigateToKirbyTag = async (
	target: NavigationTarget,
	endpoints: EndpointsConfig | undefined,
	panel: Panel
): Promise<void> => {
	if (target.type === 'external') {
		window.open(target.reference, '_blank');
		return;
	}

	if (!endpoints) return;

	try {
		const fieldPath = endpoints.field.startsWith('/api/')
			? endpoints.field.substring(4)
			: endpoints.field;
		const apiUrl = `${fieldPath}/resolve-kirbytag`;

		const response = await panel.api.post<ResolvedKirbyTag>(apiUrl, {
			reference: target.reference,
			type: target.type,
		});

		if (response.type === 'external' && response.url) {
			window.open(response.url, '_blank');
		} else if (response.panelUrl) {
			panel.open(response.panelUrl);
		}
	} catch {
		const wp = window as unknown as { panel: Panel & { $t: (key: string) => string } };
		panel.notification.error(wp.panel.$t('tiptap.navigate.error'));
	}
};

/**
 * Find the [start, end] offset of the main reference value within a KirbyTag string.
 * For example, in "(link: page://abc text: foo)" returns the position of "page://abc".
 * Returns null if no reference range can be determined.
 */
export const findReferenceRange = (tagString: string): [number, number] | null => {
	const typeMatch = tagString.match(/^\((\w+):\s*/);
	if (!typeMatch) return null;

	const type = typeMatch[1];
	const valueStart = typeMatch[0].length;

	const fieldPattern = /\s+(\w+):(?!\/\/)\s*/g;
	fieldPattern.lastIndex = valueStart;
	const nextField = fieldPattern.exec(tagString);

	const valueEnd = nextField ? nextField.index : tagString.length - 1;

	// Trim the value to get exact boundaries
	const rawValue = tagString.substring(valueStart, valueEnd);
	const trimmedStart = valueStart + (rawValue.length - rawValue.trimStart().length);
	const trimmedEnd = valueEnd - (rawValue.length - rawValue.trimEnd().length);

	if (trimmedStart >= trimmedEnd) return null;

	// Only return range for navigable reference types
	if (type === 'email' || type === 'tel') return null;
	if (type === 'link') {
		const value = tagString.substring(trimmedStart, trimmedEnd);
		if (value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('#')) {
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
	const fieldPath = endpoints.field.startsWith('/api/')
		? endpoints.field.substring(4)
		: endpoints.field;

	const response = await panel.api.post<{ results: Record<string, boolean> }>(
		`${fieldPath}/check-kirbytags`,
		{ references }
	);

	return response.results;
};

const LINK_TAG_PREFIXES = ['(link:', '(email:', '(tel:'] as const;

/**
 * Checks if text is a link-type KirbyTag (link, email, or tel)
 */
export const isLinkTag = (text: string | null): boolean => {
	if (!text) return false;
	return LINK_TAG_PREFIXES.some(prefix => text.startsWith(prefix));
};

/**
 * Checks if text is a complete link-type KirbyTag (starts with link prefix and ends with ")")
 */
export const isCompleteLinkTag = (text: string | null): boolean => {
	if (!text) return false;
	return isLinkTag(text) && text.endsWith(')');
};
