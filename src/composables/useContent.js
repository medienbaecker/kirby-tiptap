import { watch } from "vue";
import { processPlainTextParagraphs } from "../utils/contentProcessing";

/**
 * Composable for managing Tiptap content parsing, sanitization, and emission
 * @param {Object} editor - Editor ref
 * @param {Object} sanitizer - Content sanitizer instance
 * @param {Object} props - Component props
 * @param {Function} emit - Vue emit function
 * @returns {Object} Content management functions
 */
export function useContent(editor, sanitizer, props, emit) {
	/**
	 * @param {string|Object} value - Raw content value
	 * @returns {Object|string} Parsed and sanitized content
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
		} catch {
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
	 * Checks if sanitized content is empty
	 * @param {Object} sanitizedContent - Sanitized content object
	 * @returns {boolean} Whether content is empty
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
	 * @param {Object} editorInstance - Tiptap editor instance
	 */
	const emitContent = (editorInstance) => {
		if (!editorInstance) {
			emit("input", { json: "" });
			return;
		}

		const content = editorInstance.getJSON();

		if (!content) {
			emit("input", { json: "" });
			return;
		}

		const sanitizedContent = sanitizer.sanitizeContent(content);

		if (!sanitizedContent || !sanitizedContent.content) {
			emit("input", { json: "" });
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
	};

	/**
	 * Watches for value changes and updates editor content
	 */
	const watchValue = () => {
		watch(
			() => props.value,
			(newValue) => {
				if (editor.value) {
					const newContent = parseContent(newValue);
					const currentContent = editor.value.getJSON();

					if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
						const { from, to } = editor.value.state.selection;
						editor.value.commands.setContent(newContent, false);
						editor.value.commands.setTextSelection({ from, to });
					}
				}
			},
			{ deep: true }
		);
	};

	return {
		parseContent,
		isContentEmpty,
		emitContent,
		watchValue,
	};
}
