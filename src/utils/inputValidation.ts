import { generateKirbyTag, normalizeHref, isUnsavable } from "./kirbyTags";
import type { KirbytagsMap, ValidationResult } from "../types";

/**
 * Validates input and determines its type (email, URL, or plain text)
 */
export function validateInput(
	text: string,
	allowedTypes: string[] = []
): ValidationResult {
	// Helper function to check if a type is allowed
	// If no types specified, allow all types
	const isAllowed = (type: string) => allowedTypes.length === 0 || allowedTypes.includes(type);

	// Email validation
	if (isAllowed("email") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
		return { type: "email", href: `mailto:${text}` };
	}

	// URL validation
	if (isAllowed("url")) {
		try {
			new URL(text);
			if (text.startsWith("http://") || text.startsWith("https://")) {
				return { type: "url", href: text };
			}
		} catch {
			// Not a valid URL
		}
	}

	// Plain text (not recognized as any special type or type not allowed)
	return { type: "unknown", text };
}

interface LinkTagValues {
	href: string;
	text?: string;
	_type?: string;
	[key: string]: unknown;
}

/**
 * The tag a link becomes, by its href's scheme, and the tag's main value
 */
export const splitHref = (href: string): { type: string; mainValue: string } => {
	const scheme = href.match(/^(mailto|tel):/)?.[1];
	return {
		type: scheme === "mailto" ? "email" : (scheme ?? "link"),
		mainValue: href.replace(/^(mailto|tel):/, ""),
	};
};

/**
 * Generates a KirbyTag for link/email based on input values
 */
export function generateLinkTag(values: LinkTagValues): string {
	const { href, text, _type, ...attrs } = values;
	const { type, mainValue } = splitHref(href);

	return generateKirbyTag(type, mainValue, { text, ...attrs });
}

/**
 * An anchor a Markdown parser generated from a bare URL. Turning it into a
 * tag would change the rendered text, because Html::link shortens URLs
 */
export const isBareUrlAnchor = (href: string, text: string): boolean =>
	/^https?:\/\//i.test(href) && text === href;

/**
 * The link tag for an anchor, or null when Kirby couldn't read its href
 * or text back from a tag
 */
export function buildLinkTag(
	href: string,
	text: string,
	tags?: KirbytagsMap
): string | null {
	const normalized = normalizeHref(href);
	const { type, mainValue } = splitHref(normalized);
	const labelled = text !== "" && text !== normalized && text !== mainValue;

	if (isUnsavable(type, mainValue, tags) || (labelled && isUnsavable(type, text, tags))) {
		return null;
	}

	return generateLinkTag({
		href: normalized,
		text: labelled ? text : undefined,
	});
}
