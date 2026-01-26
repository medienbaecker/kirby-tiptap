import type { Ref } from "vue";
import type { Editor } from "@tiptap/vue-2";
import type { Panel } from "kirby-types";
import type { UploadsConfig, EndpointsConfig } from "../types";

interface UploadOptions {
	url: string;
	multiple: boolean;
	attributes?: {
		template?: string;
		parent?: string;
	};
	on?: {
		done: (files: unknown[][]) => void;
		cancel: () => void;
		error: (error: Error) => void;
	};
}

interface UploadedFile {
	dragText?: string;
	[key: string]: unknown;
}

/**
 * Validate upload configuration and permissions
 */
export function validateUploadConfig(
	uploads: UploadsConfig | boolean | undefined,
	endpoints: EndpointsConfig | undefined,
	panel: Panel
): uploads is UploadsConfig {
	if (!uploads) {
		panel.notification.error('Uploads are not enabled for this field');
		return false;
	}

	if (!endpoints?.field) {
		panel.notification.error('Upload endpoint not configured');
		return false;
	}

	return typeof uploads !== 'boolean';
}

/**
 * Build upload options object for Kirby panel
 */
export function buildUploadOptions(
	endpoints: EndpointsConfig,
	uploads: UploadsConfig,
	panel: Panel
): UploadOptions {
	const options: UploadOptions = {
		url: panel.urls.api + "/" + endpoints.field + "/upload",
		multiple: false
	};

	// Add upload attributes if specified
	if (uploads.template || uploads.parent) {
		options.attributes = {};
		if (uploads.template) {
			options.attributes.template = uploads.template;
		}
		if (uploads.parent) {
			options.attributes.parent = uploads.parent;
		}
	}

	return options;
}

/**
 * Process uploaded files and generate content
 */
export function processUploadedFiles(uploadedFiles: unknown[][]): string[] {
	if (!uploadedFiles?.length) {
		return [];
	}

	return uploadedFiles
		.map((fileArray) => {
			// Each upload is nested: uploadedFiles[0][0] contains the actual file
			const file = fileArray[0] as UploadedFile | undefined;
			if (!file?.dragText) {
				return null;
			}
			return file.dragText;
		})
		.filter((text): text is string => text !== null);
}

/**
 * Prepare content for insertion at drop position
 */
export function prepareInsertionContent(
	contents: string[],
	dropPosition: number,
	editor: Editor
): string {
	if (!contents.length) {
		return '';
	}

	// Check if we need a space before insertion
	const prevChar = dropPosition > 0
		? editor.state.doc.textBetween(dropPosition - 1, dropPosition)
		: '';
	const needsSpace = prevChar && prevChar !== ' ' && prevChar !== '\n';

	// Join contents with double line breaks
	const joinedContent = contents.join('\n\n');

	// Add space if needed
	return needsSpace ? ' ' + joinedContent : joinedContent;
}

/**
 * Insert content at specified position in editor
 */
export function insertContentAtPosition(
	editor: Editor,
	position: number,
	content: string
): void {
	if (!content) {
		return;
	}

	editor
		.chain()
		.focus()
		.insertContentAt(position, content, {
			parseOptions: { preserveWhitespace: true }
		})
		.unsetAllMarks()
		.run();
}

/**
 * Create upload success handler
 */
export function createUploadSuccessHandler(
	editorRef: Ref<Editor | null>,
	dropPosition: number,
	panel: Panel
): (uploadedFiles: unknown[][]) => void {
	return (uploadedFiles) => {
		try {
			// Restore selection to drop position
			editorRef.value?.commands.setTextSelection({
				from: dropPosition,
				to: dropPosition
			});

			// Process uploaded files
			const contents = processUploadedFiles(uploadedFiles);

			if (contents.length > 0 && editorRef.value) {
				const finalContent = prepareInsertionContent(
					contents,
					dropPosition,
					editorRef.value
				);

				insertContentAtPosition(
					editorRef.value,
					dropPosition,
					finalContent
				);

				panel.notification.success('File uploaded and inserted successfully');
			} else {
				panel.notification.error('No content could be generated from uploaded files');
			}
		} catch (error) {
			console.error('File upload processing error:', error);
			panel.notification.error('Failed to process uploaded file');
		}
	};
}

/**
 * Create upload error handler
 */
export function createUploadErrorHandler(
	editorRef: Ref<Editor | null>,
	originalFrom: number,
	originalTo: number,
	panel: Panel
): (error: Error) => void {
	return (error) => {
		console.error('File upload error:', error);
		panel.notification.error('Upload failed');
		// Restore original selection
		editorRef.value?.commands.setTextSelection({
			from: originalFrom,
			to: originalTo
		});
	};
}

/**
 * Create upload cancel handler
 */
export function createUploadCancelHandler(
	editorRef: Ref<Editor | null>,
	originalFrom: number,
	originalTo: number
): () => void {
	return () => {
		// Restore original selection
		editorRef.value?.commands.setTextSelection({
			from: originalFrom,
			to: originalTo
		});
	};
}
