import type { Ref } from "vue";
import type { Editor } from "@tiptap/vue-2";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";
import type { Panel, PanelHelpers } from "kirby-types";
import { validateInput, generateLinkTag } from "./inputValidation";
import { processPlainTextParagraphs } from "./contentProcessing";
import { findKirbyTagRanges } from "./kirbyTags";
import {
	validateUploadConfig,
	buildUploadOptions,
	createUploadSuccessHandler,
	createUploadErrorHandler,
	createUploadCancelHandler
} from "./fileUploadHelpers";
import type { UploadsConfig, EndpointsConfig, UuidConfig } from "../types";

interface Coordinates {
	pos: number;
	inside?: number;
}

/**
 * Helper to process KirbyTag through API for UUID conversion
 */
export async function processKirbyTagApi(
	kirbyTag: string,
	endpoints: EndpointsConfig | null | undefined,
	panel: Panel | null
): Promise<string> {
	if (!endpoints || !panel || !kirbyTag) {
		return kirbyTag;
	}

	try {
		// Remove /api prefix if present, since panel.api.post() adds it automatically
		const fieldPath = endpoints.field.startsWith("/api/")
			? endpoints.field.substring(4)
			: endpoints.field;
		const apiUrl = `${fieldPath}/process-kirbytag`;

		const response = await panel.api.post<{ text?: string }>(apiUrl, { kirbyTag });
		return response.text || kirbyTag;
	} catch {
		return kirbyTag;
	}
}

/**
 * Handles paste events in the editor
 */
export function createPasteHandler(
	editorRef: Ref<Editor | null>,
	allowedTypes: string[] = []
): (view: EditorView, event: ClipboardEvent, slice: Slice) => boolean | void {
	return (view, event) => {
		// HTML content
		const htmlContent = event.clipboardData?.getData("text/html") || "";
		if (htmlContent.trim()) {
			return false;
		}

		const plainText = (event.clipboardData?.getData("text/plain") || "").trim();
		const selection = view.state.selection;
		const selectedText = !selection.empty
			? view.state.doc.textBetween(selection.from, selection.to)
			: "";

		// Selected text with link Kirbytag generation
		if (selectedText) {
			const validation = validateInput(plainText, allowedTypes);
			if (validation.type !== "unknown") {
				// Don't wrap in a KirbyTag if the selection is inside an existing one
				const resolved = selection.$from.parent.textContent;
				const offset = selection.from - selection.$from.start();
				const tagRanges = findKirbyTagRanges(resolved);
				const insideTag = tagRanges.some(([s, e]) => offset >= s && offset < e);

				if (!insideTag) {
					const kirbyTag = generateLinkTag({
						href: validation.href,
						text: selectedText,
					});

					editorRef.value
						?.chain()
						.focus()
						.insertContentAt(selection, kirbyTag)
						.run();

					event.preventDefault();
					return true;
				}
			}
		}

		// Plain text with double line breaks? Create paragraphs
		const content = processPlainTextParagraphs(plainText);
		if (content) {
			editorRef.value?.commands.insertContent(content);
			event.preventDefault();
			return true;
		}

		return false;
	};
}

/**
 * Handles text drop operations (pages, files) with API-based UUID conversion
 */
export async function handleTextDrop(
	editorRef: Ref<Editor | null>,
	coordinates: Coordinates,
	dragText: string,
	uuid: UuidConfig = { pages: true, files: true },
	endpoints: EndpointsConfig | null = null,
	panel: Panel | null = null
): Promise<void> {
	const pos = coordinates.pos;
	const prevChar =
		pos > 0 ? editorRef.value?.state.doc.textBetween(pos - 1, pos) : "";
	const needsSpace = prevChar && prevChar !== " ";

	// Process dragText through API for UUID conversion
	let content = await processKirbyTagApi(dragText, endpoints, panel);

	content = needsSpace ? " " + content : content;

	editorRef.value
		?.chain()
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
 */
export function createDropHandler(
	editorRef: Ref<Editor | null>,
	panel: Panel,
	helper: PanelHelpers | null,
	endpoints: EndpointsConfig | undefined,
	uploads: UploadsConfig | false | undefined,
	uuid: UuidConfig = { pages: true, files: true }
): (view: EditorView, event: DragEvent, slice: Slice, moved: boolean) => boolean {
	return (view, event, slice, moved) => {
		if (!moved && panel.drag.data) {
			const coordinates = view.posAtCoords({
				left: event.clientX,
				top: event.clientY,
			});

			if (!coordinates) return false;

			if (panel.drag.type === "text") {
				// Process the dragText according to UUID configuration
				const dragText = panel.drag.data as unknown as string;
				handleTextDrop(
					editorRef,
					coordinates,
					dragText,
					uuid,
					endpoints || null,
					panel
				);
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
 */
function handleFileUpload(
	editorRef: Ref<Editor | null>,
	coordinates: Coordinates,
	event: DragEvent,
	endpoints: EndpointsConfig | undefined,
	uploads: UploadsConfig | false | undefined,
	panel: Panel
): void {
	// Validate upload configuration
	if (!validateUploadConfig(uploads, endpoints, panel)) {
		return;
	}

	try {
		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) {
			return;
		}

		// Store current selection for restoration after upload
		const selection = editorRef.value?.state.selection;
		const originalFrom = selection?.from || 0;
		const originalTo = selection?.to || 0;
		const dropPosition = coordinates.pos;

		// Build upload options
		const uploadOptions = buildUploadOptions(
			endpoints!,
			uploads as UploadsConfig,
			panel
		);

		// Add event handlers
		uploadOptions.on = {
			done: createUploadSuccessHandler(editorRef, dropPosition, panel),
			cancel: createUploadCancelHandler(editorRef, originalFrom, originalTo),
			error: createUploadErrorHandler(editorRef, originalFrom, originalTo, panel)
		};

		// Use Kirby's upload dialog (same as textarea field)
		panel.upload.open(files, uploadOptions);
	} catch {
		panel.notification.error('File upload setup failed');
	}
}
