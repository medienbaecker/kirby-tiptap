import { generateKirbyTag } from "./kirbyTags";
import type { ValidationResult } from "../types";

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
 * Generates a KirbyTag for link/email based on input values
 */
export function generateLinkTag(values: LinkTagValues): string {
	const { href, text, _type, ...attrs } = values;

	// Determine tag type based on href
	let type = "link";
	let mainValue = href;

	if (href.startsWith("mailto:")) {
		type = "email";
		mainValue = href.replace("mailto:", "");
	} else if (href.startsWith("tel:")) {
		type = "tel";
		mainValue = href.replace("tel:", "");
	}

	return generateKirbyTag(type, mainValue, { text, ...attrs });
}
