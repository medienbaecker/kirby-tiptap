import type { ParsedKirbyTag } from "../types";

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

	// Create a regex for finding field markers
	const fieldPattern = /\s+(\w+):\s+/g;

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

/**
 * Traverses up the DOM tree to find an element with the specified class
 */
export const findParentWithClass = (node: Node, className: string): Element | null => {
	let cur: Node | null = node.nodeType === 3 ? node.parentNode : node;
	while (cur) {
		if ((cur as Element).classList?.contains(className)) return cur as Element;
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
 * Link-type tags that can be edited with the link dialog
 */
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
