/**
 * Content sanitizer for Tiptap content based on enabled buttons
 * Ensures only permitted formatting is retained in the editor
 */
export class ContentSanitizer {
	constructor(buttons) {
		this.buttons = buttons;
		this.headingLevels =
			buttons.find((btn) => typeof btn === "object" && btn.headings)
				?.headings || [];
	}

	sanitizeContent(content) {
		if (!content) return content;

		if (typeof content === "string") {
			try {
				content = JSON.parse(content);
			} catch {
				return content;
			}
		}

		const sanitizeNode = (node) => {
			if (!node) return node;

			// Ensure paragraphs always have a content array
			if (node.type === "paragraph" && !node.content) {
				node.content = [];
			}

			// Filter out disabled marks
			if (node.marks) {
				node.marks = node.marks.filter((mark) =>
					this.buttons.includes(mark.type)
				);
			}

			// Convert disabled blocks to paragraphs
			if (node.type === "heading") {
				const hasHeadings = this.buttons.some((btn) =>
					typeof btn === "object" ? "headings" in btn : btn === "headings"
				);
				if (
					!hasHeadings ||
					(this.headingLevels.length &&
						!this.headingLevels.includes(node.attrs?.level))
				) {
					node = { type: "paragraph", content: node.content || [] };
				}
			}

			if (
				(node.type === "bulletList" && !this.buttons.includes("bulletList")) ||
				(node.type === "orderedList" && !this.buttons.includes("orderedList"))
			) {
				node = {
					type: "paragraph",
					content: node.content?.flatMap((item) => item.content || []) || [],
				};
			}

			// Recursively process children
			if (node.content && Array.isArray(node.content)) {
				node.content = node.content.map(sanitizeNode);
			}

			return node;
		};

		if (Array.isArray(content)) {
			return content.map(sanitizeNode);
		}

		if (content.content && Array.isArray(content.content)) {
			return {
				...content,
				content: content.content.map(sanitizeNode),
			};
		}

		return sanitizeNode(content);
	}
}
