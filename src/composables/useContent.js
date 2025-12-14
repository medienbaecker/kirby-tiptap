import { processPlainTextParagraphs } from "../utils/contentProcessing";

/**
 * Composable for managing Tiptap content parsing and emission
 * @param {Object} props - Component props
 * @param {Function} emit - Vue emit function
 * @param {Object} lastEmittedJson - Ref to track last emitted JSON for value sync
 * @returns {Object} Content management functions
 */
export function useContent(props, emit, lastEmittedJson) {
	/**
	 * Parse content from various input formats
	 * Handles JSON strings, plain text with line breaks, and raw HTML
	 * @param {string|Object} value - Raw content value from field
	 * @returns {Object|string} Parsed content ready for editor
	 */
	const parseContent = (value) => {
		// Handle non-string values (already parsed)
		if (typeof value !== "string") {
			return value;
		}

		// Try to parse as JSON first
		try {
			return JSON.parse(value);
		} catch (error) {
			// Not JSON - handle plain text with double line breaks
			const processedContent = processPlainTextParagraphs(value);
			if (processedContent) {
				return processedContent;
			}

			// Return raw value for single line text or HTML
			return value;
		}
	};

	/**
	 * Checks if content is effectively empty
	 * Considers content empty if it has no nodes or only empty paragraphs
	 * Special case: headings are never considered empty
	 * @param {Object} content - Tiptap document object
	 * @returns {boolean} True if content is empty, false otherwise
	 */
	const isContentEmpty = (content) => {
		// Check if content array exists and has items
		if (
			!Array.isArray(content.content) ||
			content.content.length === 0
		) {
			return true;
		}

		// If there's only one element
		if (content.content.length === 1) {
			const firstNode = content.content[0];

			// Special handling for headings - they're not empty even without content
			if (firstNode.type === "heading") {
				return false;
			}

			// Check if element has content array
			if (!Array.isArray(firstNode.content)) {
				return true;
			}

			// Check if content is empty
			return firstNode.content.length === 0;
		}

		return false;
	};

	/**
	 * Emits content changes to parent component
	 * Formats editor content as JSON
	 * @param {Object} editorInstance - Tiptap editor instance
	 * @emits {Object} input - Emits { json: string } to parent component
	 */
	const emitContent = (editorInstance) => {
		if (!editorInstance) {
			emit("input", { json: "" });
			if (lastEmittedJson) {
				lastEmittedJson.value = "";
			}
			return;
		}

		const content = editorInstance.getJSON();

		if (!content || !content.content) {
			emit("input", { json: "" });
			if (lastEmittedJson) {
				lastEmittedJson.value = "";
			}
			return;
		}

		const isEmpty = isContentEmpty(content);

		const json = isEmpty
			? ""
			: JSON.stringify(
					{
						type: "doc",
						content: content.content,
						inline: props.inline,
					},
					null,
					props.pretty ? 2 : 0
			  );

		emit("input", { json });

		// Track the emitted JSON to differentiate from external value changes
		if (lastEmittedJson) {
			lastEmittedJson.value = json;
		}
	};

	return {
		parseContent,
		isContentEmpty,
		emitContent,
	};
}
