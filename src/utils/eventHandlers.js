/**
 * Event handlers for Tiptap editor
 * Handles paste, drop, and other user interactions
 */

import { validateInput, generateLinkTag } from "./inputValidation";
import { processPlainTextParagraphs } from "./contentProcessing";
import {
	validateUploadConfig,
	buildUploadOptions,
	createUploadSuccessHandler,
	createUploadErrorHandler,
	createUploadCancelHandler
} from "./fileUploadHelpers";

/**
 * Helper to process KirbyTag through API for UUID conversion
 * @param {string} kirbyTag - The KirbyTag to process
 * @param {Object} endpoints - API endpoints configuration
 * @param {Object} panel - Kirby panel object
 * @returns {Promise<string>} Processed KirbyTag
 */
export async function processKirbyTagApi(kirbyTag, endpoints, panel) {
	if (!endpoints || !panel || !kirbyTag) {
		return kirbyTag;
	}

	try {
		// Remove /api prefix if present, since panel.api.post() adds it automatically
		const fieldPath = endpoints.field.startsWith("/api/")
			? endpoints.field.substring(4)
			: endpoints.field;
		const apiUrl = `${fieldPath}/process-kirbytag`;

		const response = await panel.api.post(apiUrl, { kirbyTag });
		return response.text || kirbyTag;
	} catch (error) {
		console.error('Failed to process KirbyTag:', error);
		return kirbyTag;
	}
}

/**
 * Handles paste events in the editor
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Array} allowedTypes - Array of allowed link types from field config
 * @returns {Function} The paste handler function
 */
export function createPasteHandler(editorRef, allowedTypes = []) {
	return (view, event, slice) => {
		// HTML content
		const htmlContent = event.clipboardData.getData("text/html");
		if (htmlContent.trim()) {
			return false;
		}

		const plainText = event.clipboardData.getData("text/plain").trim();
		const selection = view.state.selection;
		const selectedText = !selection.empty
			? view.state.doc.textBetween(selection.from, selection.to)
			: "";

		// Selected text with link Kirbytag generation
		if (selectedText) {
			const validation = validateInput(plainText, allowedTypes);
			if (validation.type !== "text") {
				const kirbyTag = generateLinkTag({
					href: validation.href,
					text: selectedText,
				});

				editorRef.value
					.chain()
					.focus()
					.insertContentAt(selection, kirbyTag)
					.run();

				event.preventDefault();
				return true;
			}
		}

		// Plain text with double line breaks? Create paragraphs
		const content = processPlainTextParagraphs(plainText);
		if (content) {
			editorRef.value.commands.insertContent(content);
			event.preventDefault();
			return true;
		}

		return false;
	};
}

/**
 * Handles text drop operations (pages, files) with API-based UUID conversion
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Object} coordinates - Drop coordinates
 * @param {string} dragText - The drag text containing KirbyTag
 * @param {Object} uuid - UUID configuration
 * @param {Object} endpoints - API endpoints configuration
 * @param {Object} panel - Kirby panel object
 */
export async function handleTextDrop(
	editorRef,
	coordinates,
	dragText,
	uuid = { pages: true, files: true },
	endpoints = null,
	panel = null
) {
	const pos = coordinates.pos;
	const prevChar =
		pos > 0 ? editorRef.value.state.doc.textBetween(pos - 1, pos) : "";
	const needsSpace = prevChar && prevChar !== " ";

	// Process dragText through API for UUID conversion
	let content = await processKirbyTagApi(dragText, endpoints, panel);

	content = needsSpace ? " " + content : content;

	editorRef.value
		.chain()
		.focus()
		.insertContentAt(pos, content, {
			parseOptions: { preserveWhitespace: true },
		})
		.unsetAllMarks()
		.run();
}

/**
 * Creates drop handler for the editor
 * Handles drag and drop operations from Kirby panel and file uploads
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Object} panel - Kirby panel instance
 * @param {Object} helper - Kirby helper instance
 * @param {Object} endpoints - API endpoints for uploads
 * @param {Object} uploads - Upload configuration
 * @param {Object} uuid - UUID configuration
 * @returns {Function} The drop handler function
 */
export function createDropHandler(
	editorRef,
	panel,
	helper,
	endpoints,
	uploads,
	uuid = { pages: true, files: true }
) {
	return (view, event, slice, moved) => {
		if (!moved && panel.drag.data) {
			const coordinates = view.posAtCoords({
				left: event.clientX,
				top: event.clientY,
			});

			if (panel.drag.type === "text") {
				// Process the dragText according to UUID configuration
				const dragText = panel.drag.data;
				handleTextDrop(
					editorRef,
					coordinates,
					dragText,
					uuid,
					endpoints,
					panel
				);
			} else if (helper?.isUploadEvent && helper.isUploadEvent(event)) {
				handleFileUpload(
					editorRef,
					coordinates,
					event,
					endpoints,
					uploads,
					panel,
					uuid
				);
			}

			return true;
		}
		return false;
	};
}

/**
 * Handles file upload from drag & drop
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Object} coordinates - Drop coordinates
 * @param {Event} event - The drop event
 * @param {Object} endpoints - API endpoints
 * @param {Object} uploads - Upload configuration
 * @param {Object} panel - Kirby panel instance
 * @param {Object} uuid - UUID configuration (currently unused, kept for compatibility)
 */
function handleFileUpload(
	editorRef,
	coordinates,
	event,
	endpoints,
	uploads,
	panel
) {
	// Validate upload configuration
	if (!validateUploadConfig(uploads, endpoints, panel)) {
		return;
	}

	try {
		const files = event.dataTransfer.files;
		if (!files || files.length === 0) {
			return;
		}

		// Store current selection for restoration after upload
		const { from: originalFrom, to: originalTo } = editorRef.value.state.selection;
		const dropPosition = coordinates.pos;

		// Build upload options
		const uploadOptions = buildUploadOptions(endpoints, uploads, panel);
		
		// Add event handlers
		uploadOptions.on = {
			done: createUploadSuccessHandler(editorRef, dropPosition, panel),
			cancel: createUploadCancelHandler(editorRef, originalFrom, originalTo),
			error: createUploadErrorHandler(editorRef, originalFrom, originalTo, panel)
		};


		// Use Kirby's upload dialog (same as textarea field)
		panel.upload.open(files, uploadOptions);
	} catch (error) {
		console.error('File upload setup error:', error);
		panel.notification.error('File upload setup failed');
	}
}
