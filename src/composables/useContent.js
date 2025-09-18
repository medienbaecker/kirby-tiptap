import { processPlainTextParagraphs } from "../utils/contentProcessing";

/**
 * Composable for managing Tiptap content parsing, sanitization, and emission
 * @param {Object} editor - Editor ref
 * @param {Object} sanitizer - Content sanitizer instance
 * @param {Object} props - Component props
 * @param {Function} emit - Vue emit function
 * @param {Object} lastEmittedJson - Ref to track last emitted JSON for value sync
 * @returns {Object} Content management functions
 */
export function useContent(editor, sanitizer, props, emit, lastEmittedJson) {
	/**
	 * Parse and sanitize content from various input formats
	 * Handles JSON strings, plain text with line breaks, and raw HTML
	 * @param {string|Object} value - Raw content value from field
	 * @returns {Object|string} Parsed and sanitized content ready for editor
	 */
	const parseContent = (value) => {
		// Handle non-string values
		if (typeof value !== "string") {
			return sanitizer.sanitizeContent(value);
		}

		// Try to parse as JSON first
		try {
			const content = JSON.parse(value);
			return sanitizer.sanitizeContent(content);
		} catch (error) {
			// Not JSON - handle as plain text

			// Not JSON - handle plain text with double line breaks
			const processedContent = processPlainTextParagraphs(value);
			if (processedContent) {
				return sanitizer.sanitizeContent(processedContent);
			}

			// Return raw value for single line text or HTML
			return value;
		}
	};

	/**
	 * Checks if sanitized content is effectively empty
	 * Considers content empty if it has no nodes or only empty paragraphs
	 * Special case: headings are never considered empty
	 * @param {Object} sanitizedContent - Sanitized Tiptap document object
	 * @returns {boolean} True if content is empty, false otherwise
	 */
	const isContentEmpty = (sanitizedContent) => {
		// Check if content array exists and has items
		if (
			!Array.isArray(sanitizedContent.content) ||
			sanitizedContent.content.length === 0
		) {
			return true;
		}

		// If there's only one element
		if (sanitizedContent.content.length === 1) {
			const firstNode = sanitizedContent.content[0];

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
	 * Processes editor content through sanitization and formats as JSON
	 * Handles empty content by emitting empty string
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

		if (!content) {
			emit("input", { json: "" });
			if (lastEmittedJson) {
				lastEmittedJson.value = "";
			}
			return;
		}

		const sanitizedContent = sanitizer.sanitizeContent(content);

		if (!sanitizedContent || !sanitizedContent.content) {
			emit("input", { json: "" });
			if (lastEmittedJson) {
				lastEmittedJson.value = "";
			}
			return;
		}

		const isEmpty = isContentEmpty(sanitizedContent);

		const json = isEmpty
			? ""
			: JSON.stringify(
					{
						type: "doc",
						content: sanitizedContent.content,
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
