import type { Ref } from "vue";
import type { Editor } from "@tiptap/vue-2";
import { processPlainTextParagraphs } from "../utils/contentProcessing";
import { prepareDocForMarkdown } from "../utils/markdownDoc";
import type { TiptapDocument, TiptapNode, KirbytagsMap } from "../types";

interface ContentProps {
	inline?: boolean;
	pretty?: boolean;
	format?: "json" | "markdown";
	kirbytags?: KirbytagsMap;
}

interface UseContentReturn {
	parseContent: (value: string | TiptapDocument) => TiptapDocument | string;
	isContentEmpty: (content: TiptapDocument) => boolean;
	emitContent: (editorInstance: Editor | null) => void;
}

/**
 * Composable for managing Tiptap content parsing and emission
 */
export function useContent(
	props: ContentProps,
	emit: (event: string, value: { json: string }) => void,
	lastEmittedJson?: Ref<string>
): UseContentReturn {
	/**
	 * Parse content from various input formats
	 * Handles JSON strings, plain text with line breaks, and raw HTML
	 */
	const parseContent = (
		value: string | TiptapDocument
	): TiptapDocument | string => {
		// Handle non-string values (already parsed)
		if (typeof value !== "string") {
			return value;
		}

		// Markdown values are handled by the editor's markdown extension
		if (props.format === "markdown") {
			return value;
		}

		// Try to parse as JSON first
		try {
			return JSON.parse(value) as TiptapDocument;
		} catch {
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
	 */
	const isContentEmpty = (content: TiptapDocument): boolean => {
		// Check if content array exists and has items
		if (!Array.isArray(content.content) || content.content.length === 0) {
			return true;
		}

		// A lone node is only "empty" if it's an empty paragraph; any other one
		// (heading, hr, registry atoms) is real content.
		if (content.content.length === 1) {
			const firstNode = content.content[0] as TiptapNode;

			return (
				firstNode.type === "paragraph" &&
				(!Array.isArray(firstNode.content) || firstNode.content.length === 0)
			);
		}

		return false;
	};

	/**
	 * Emits content changes to parent component
	 * Formats editor content as JSON
	 */
	const emitContent = (editorInstance: Editor | null): void => {
		if (!editorInstance) {
			emit("input", { json: "" });
			if (lastEmittedJson) {
				lastEmittedJson.value = "";
			}
			return;
		}

		const content = editorInstance.getJSON() as TiptapDocument;

		if (!content || !content.content) {
			emit("input", { json: "" });
			if (lastEmittedJson) {
				lastEmittedJson.value = "";
			}
			return;
		}

		const isEmpty = isContentEmpty(content);

		let json = "";
		if (!isEmpty) {
			if (props.format === "markdown") {
				json = (
					editorInstance as unknown as {
						markdown: { serialize: (doc: TiptapDocument) => string };
					}
				).markdown.serialize(
					prepareDocForMarkdown(content, props.kirbytags, props.inline)
				);
			} else {
				json = JSON.stringify(
					{
						type: "doc",
						content: content.content,
						inline: props.inline,
					},
					null,
					props.pretty ? 2 : 0
				);
			}
		}

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
