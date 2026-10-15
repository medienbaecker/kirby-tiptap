import { buildLinkTag, isBareUrlAnchor } from "./inputValidation";

/**
 * Replaces <a> elements in HTML with KirbyTag text equivalents.
 * E.g. <a href="https://example.com">click here</a>
 *    → (link: https://example.com text: click here)
 */
export function transformLinksToKirbyTags(html: string): string {
	const doc = new DOMParser().parseFromString(html, "text/html");

	for (const anchor of Array.from(doc.querySelectorAll("a[href]"))) {
		const href = anchor.getAttribute("href") || "";
		// Newlines inside a tag split it across text nodes and break detection
		const text = (anchor.textContent || "").replace(/\s+/g, " ").trim();

		if (
			!href ||
			href === "#" ||
			/^(javascript|data):/i.test(href) ||
			isBareUrlAnchor(href, text)
		) {
			continue;
		}

		anchor.replaceWith(doc.createTextNode(buildLinkTag(href, text)));
	}

	return doc.body.innerHTML;
}

export const containsAnchor = (value: string): boolean => /<a[\s>]/i.test(value);
