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

const BLOCKS = "p, div, li, blockquote, h1, h2, h3, h4, h5, h6, td, th, body";
const SPLITS_INTO_SIBLINGS = "p, div, h1, h2, h3, h4, h5, h6";

const isBreak = (node: Node): boolean => node.nodeName === "BR";

const hasRule = (node: Node): boolean =>
	node.nodeName === "HR" ||
	((node instanceof Element || node instanceof DocumentFragment) && node.querySelector("hr") !== null);

const isBlank = (node: Node): boolean => !/\S/.test(node.textContent || "") && !hasRule(node);

function findBreakRun(doc: Document): [Element, Node] | null {
	for (const br of Array.from(doc.body.querySelectorAll("br"))) {
		if (br.closest("pre, code") || (br.previousSibling && isBreak(br.previousSibling))) {
			continue;
		}

		let last: Node = br;
		let breaks = 1;
		for (let node = br.nextSibling; node && isBlank(node); node = node.nextSibling) {
			if (isBreak(node)) {
				last = node;
				breaks++;
			}
		}

		if (breaks > 1) {
			return [br, last];
		}
	}

	return null;
}

export function splitParagraphsAtBreakRuns(html: string): string {
	if (html.includes("data-pm-slice")) {
		return html;
	}

	const doc = new DOMParser().parseFromString(html, "text/html");

	for (let run = findBreakRun(doc); run; run = findBreakRun(doc)) {
		const [first, last] = run;
		const block = first.closest(BLOCKS)!;

		const before = doc.createRange();
		before.setStart(block, 0);
		before.setEndBefore(first);
		const head = before.extractContents();

		const after = doc.createRange();
		after.setStartAfter(last);
		after.setEnd(block, block.childNodes.length);
		const tail = after.extractContents();

		const parts = [head, tail].filter((part) => !isBlank(part));

		if (block.matches(SPLITS_INTO_SIBLINGS)) {
			block.replaceWith(
				...parts.map((part) => {
					const sibling = block.cloneNode(false) as Element;
					sibling.append(part);
					return sibling;
				})
			);
			continue;
		}

		block.replaceChildren(
			...parts.map((part) => {
				const wrapper = doc.createElement("div");
				wrapper.append(part);
				return wrapper;
			})
		);
	}

	return doc.body.innerHTML;
}

export const containsAnchor = (value: string): boolean => /<a[\s>]/i.test(value);
