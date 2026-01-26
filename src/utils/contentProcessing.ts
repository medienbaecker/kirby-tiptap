import type { TiptapDocument } from "../types";

/**
 * Content processing utilities for Tiptap editor
 * Handles conversion of plain text to Tiptap JSON format
 */

/**
 * Processes plain text with double line breaks into paragraph structures
 */
export function processPlainTextParagraphs(text: string): TiptapDocument | null {
	// Only process plain text strings that contain double line breaks
	if (typeof text !== "string" || !text.includes("\n\n")) {
		return null;
	}

	const paragraphs = text
		.split(/\n{2,}/) // Split on 2+ newlines
		.map(text => text.trim())
		.filter(Boolean) // Remove empty strings
		.map(text => ({
			type: "paragraph" as const,
			content: [{ type: "text" as const, text }]
		}));

	return {
		type: "doc",
		content: paragraphs.length ? paragraphs : [{
			type: "paragraph",
			content: []
		}]
	};
}
