/**
 * Event handlers for Tiptap editor
 * Handles paste, drop, and other user interactions
 */

import { validateInput, generateLinkTag } from "./inputValidation";

/**
 * Handles paste events in the editor
 * Automatically creates KirbyTags when pasting URLs over selected text
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Array} allowedTypes - Array of allowed link types from field config
 * @returns {Function} The paste handler function
 */
export function createPasteHandler(editorRef, allowedTypes = []) {
	return (view, event, slice) => {
		const selection = view.state.selection;
		const selectedText = !selection.empty
			? view.state.doc.textBetween(selection.from, selection.to)
			: "";

		if (selectedText) {
			const pastedText = event.clipboardData.getData("text/plain").trim();
			const validation = validateInput(pastedText, allowedTypes);

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
		return false;
	};
}

/**
 * Handles text drop operations
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Object} coordinates - Drop coordinates
 * @param {string} dragData - The dragged text data
 */
export function handleTextDrop(editorRef, coordinates, dragData) {
	const pos = coordinates.pos;
	const prevChar =
		pos > 0 ? editorRef.value.state.doc.textBetween(pos - 1, pos) : "";
	const needsSpace = prevChar && prevChar !== " ";
	const content = needsSpace ? " " + dragData : dragData;

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
 * @returns {Function} The drop handler function
 */
export function createDropHandler(
	editorRef,
	panel,
	helper,
	endpoints,
	uploads
) {
	return (view, event, slice, moved) => {
		if (!moved && panel.drag.data) {
			const coordinates = view.posAtCoords({
				left: event.clientX,
				top: event.clientY,
			});

			if (panel.drag.type === "text") {
				handleTextDrop(editorRef, coordinates, panel.drag.data);
			} else if (helper?.isUploadEvent && helper.isUploadEvent(event)) {
				handleFileUpload(
					editorRef,
					coordinates,
					event,
					endpoints,
					uploads,
					panel
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
 */
function handleFileUpload(
	editorRef,
	coordinates,
	event,
	endpoints,
	uploads,
	panel
) {
	if (!uploads || uploads === false) {
		panel.notification.error("Uploads are not enabled for this field");
		return;
	}

	if (!endpoints?.field) {
		panel.notification.error("Upload endpoint not configured");
		return;
	}

	try {
		const files = event.dataTransfer.files;
		if (!files || files.length === 0) {
			return;
		}

		// Store current selection for restoration after upload
		const { from, to } = editorRef.value.state.selection;
		const pos = coordinates.pos;

		const uploadOptions = {
			url: panel.urls.api + "/" + endpoints.field + "/upload",
			multiple: false,
			on: {
				done: (uploadedFiles) => {
					try {
						// Restore selection to drop position
						editorRef.value.commands.setTextSelection({ from: pos, to: pos });

						// Insert uploaded files
						if (uploadedFiles?.length > 0) {
							const contents = uploadedFiles
								.map((fileArray) => {
									// Each upload is nested: uploadedFiles[0][0] contains the actual file
									const file = fileArray[0];
									return file?.dragText;
								})
								.filter(Boolean);

							if (contents.length > 0) {
								const prevChar =
									pos > 0
										? editorRef.value.state.doc.textBetween(pos - 1, pos)
										: "";
								const needsSpace = prevChar && prevChar !== " ";
								const finalContent = needsSpace
									? " " + contents.join("\n\n")
									: contents.join("\n\n");

								editorRef.value
									.chain()
									.focus()
									.insertContentAt(pos, finalContent, {
										parseOptions: { preserveWhitespace: true },
									})
									.unsetAllMarks()
									.run();

								panel.notification.success(
									"File uploaded and inserted successfully"
								);
							} else {
								panel.notification.error(
									"No content could be generated from uploaded files"
								);
							}
						}
					} catch (error) {
						console.error("File upload processing error:", error);
						panel.notification.error(
							`Failed to process uploaded file: ${error.message}`
						);
					}
				},
				cancel: () => {
					// Restore selection to original position
					editorRef.value.commands.setTextSelection({ from, to });
				},
				error: (error) => {
					console.error("File upload error:", error);
					panel.notification.error(
						`Upload failed: ${error.message || "Unknown error"}`
					);
					// Restore selection to original position
					editorRef.value.commands.setTextSelection({ from, to });
				},
			},
		};

		// Add upload attributes if specified
		if (uploads.template || uploads.parent) {
			uploadOptions.attributes = {};
			if (uploads.template) {
				uploadOptions.attributes.template = uploads.template;
			}
			if (uploads.parent) {
				uploadOptions.attributes.parent = uploads.parent;
			}
		}

		// Use Kirby's upload dialog (same as textarea field)
		panel.upload.open(files, uploadOptions);
	} catch (error) {
		console.error("File upload setup error:", error);
		panel.notification.error(`Upload setup failed: ${error.message}`);
	}
}
