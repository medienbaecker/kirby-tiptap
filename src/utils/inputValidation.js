import { generateKirbyTag } from "./kirbyTags";

/**
 * Validates input and determines its type (email, URL, or plain text)
 * @param {string} text - Text to validate
 * @param {Array} allowedTypes - Array of allowed link types (e.g., ['email', 'url', 'page'])
 * @returns {Object} Object with type and href/text properties
 */
export function validateInput(text, allowedTypes = []) {
	// Helper function to check if a type is allowed
	// If no types specified, allow all types
	const isAllowed = (type) => allowedTypes.length === 0 || allowedTypes.includes(type);
	
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
		} catch {}
	}

	// Plain text (not recognized as any special type or type not allowed)
	return { type: "text", text };
}

/**
 * Generates a KirbyTag for link/email based on input values
 * @param {Object} values - Object with href, text, and other attributes
 * @returns {string} Formatted KirbyTag
 */
export function generateLinkTag(values) {
	const { href, text, _type, ...attrs } = values;

	// Determine tag type based on href
	let type = "link";
	let mainValue = href;

	if (href.startsWith("mailto:")) {
		type = "email";
		mainValue = href.replace("mailto:", "");
	}

	return generateKirbyTag(type, mainValue, { text, ...attrs });
}
