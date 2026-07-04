import { protectKirbyTags } from "./kirbyTags";
import type { KirbytagsMap, TiptapDocument, TiptapNode } from "../types";

const rawText = (text: string): TiptapNode => ({
	type: "text",
	text,
	marks: [{ type: "kirbytagRaw" }],
});

const isWhitespaceOnly = (node: TiptapNode): boolean =>
	node.type === "text" && /^\s*$/.test(node.text || "");

const linkMarkOf = (node: TiptapNode) =>
	node.marks?.find((mark) => mark.type === "link");

/**
 * Markdown cannot express these constructs, so they are rewritten before
 * serialization; kirbytext renders the inline HTML and the editor parses
 * it back:
 * - emphasis on whitespace-only text would serialize to literal ****
 * - hard breaks in headings and consecutive hard breaks would split the block
 * - link marks (legacy content) would silently lose their href
 */
const transformInline = (nodes: TiptapNode[], inHeading: boolean): TiptapNode[] => {
	const result: TiptapNode[] = [];

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];

		if (node.type === "hardBreak") {
			if (inHeading) {
				result.push(rawText("<br>"));
				continue;
			}
			result.push(node);
			while (i + 1 < nodes.length && nodes[i + 1].type === "hardBreak") {
				result.push(rawText("<br>"));
				i++;
			}
			continue;
		}

		const link = linkMarkOf(node);
		if (link) {
			const href = String(link.attrs?.href ?? "");
			let text = node.text || "";
			// Merge adjacent nodes of the same link
			while (
				i + 1 < nodes.length &&
				String(linkMarkOf(nodes[i + 1])?.attrs?.href ?? "") === href &&
				linkMarkOf(nodes[i + 1])
			) {
				text += nodes[i + 1].text || "";
				i++;
			}
			const isEmail = href.startsWith("mailto:");
			const value = isEmail ? href.slice(7) : href;
			const tag =
				!text || text === value || text === href
					? `(${isEmail ? "email" : "link"}: ${value})`
					: `(${isEmail ? "email" : "link"}: ${value} text: ${text.replace(/[()]/g, "\\$&")})`;
			result.push(rawText(tag));
			continue;
		}

		if (isWhitespaceOnly(node) && node.marks?.length) {
			result.push({ ...node, marks: undefined });
			continue;
		}

		result.push(node);
	}

	return result;
};

const walk = (node: TiptapNode): TiptapNode => {
	if (!node.content || node.type === "codeBlock") {
		return node;
	}
	const content = node.content.map(walk);
	const hasInline = content.some(
		(child) => child.type === "text" || child.type === "hardBreak"
	);
	return {
		...node,
		content: hasInline
			? transformInline(content, node.type === "heading")
			: content,
	};
};

/**
 * Inline fields flatten paragraphs to single line breaks in the JSON
 * pipeline; mirror that so the markdown render matches.
 */
const flattenInline = (doc: TiptapDocument): TiptapDocument => {
	const paragraphs = doc.content.filter((n) => n.type === "paragraph");
	if (paragraphs.length < 2 || paragraphs.length !== doc.content.length) {
		return doc;
	}
	const content: TiptapNode[] = [];
	paragraphs.forEach((paragraph, i) => {
		if (i > 0) content.push({ type: "hardBreak" });
		content.push(...(paragraph.content ?? []));
	});
	return { type: "doc", content: [{ type: "paragraph", content }] };
};

/**
 * Full document preparation for markdown serialization.
 */
export const prepareDocForMarkdown = (
	doc: TiptapDocument,
	tags?: KirbytagsMap,
	inline?: boolean
): TiptapDocument => {
	const flattened = inline ? flattenInline(doc) : doc;
	const transformed = walk(flattened as unknown as TiptapNode) as unknown as TiptapDocument;
	return protectKirbyTags(transformed, tags);
};
