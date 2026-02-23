import { generateLinkTag } from "./inputValidation";

/**
 * Replaces <a> elements in pasted HTML with KirbyTag text equivalents.
 * E.g. <a href="https://example.com">click here</a>
 *    → (link: https://example.com text: click here)
 */
export function transformLinksToKirbyTags(html: string): string {
	const doc = new DOMParser().parseFromString(html, "text/html");

	for (const anchor of Array.from(doc.querySelectorAll("a[href]"))) {
		const href = anchor.getAttribute("href") || "";
		const text = anchor.textContent || "";

		if (!href || href === "#" || /^(javascript|data):/i.test(href)) {
			continue;
		}

		const mainValue = href.replace(/^(mailto:|tel:)/, "");
		const kirbyTag = generateLinkTag({
			href,
			text: text && text !== href && text !== mainValue ? text : undefined,
		});
		anchor.replaceWith(doc.createTextNode(kirbyTag));
	}

	return doc.body.innerHTML;
}
