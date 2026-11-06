import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
	parseKirbyTag,
	generateKirbyTag,
	getFieldApiPath,
	getTagEditingContext,
	isFileTag,
	processKirbyTagApi,
	replaceTag,
} from "../utils/kirbyTags";
import { buildDialogFields, processFieldValues } from "../utils/dialogFields";
import { buildUploadOptions } from "../utils/upload";
import type { EndpointsConfig, FilesConfig, KirbytagsMap, ParsedKirbyTag, DialogFieldConfig, UploadsConfig } from "../types";

interface FileDialogOptions {
	endpoints?: EndpointsConfig;
	files?: FilesConfig;
	kirbytagAttributes?: KirbytagsMap;
	uploads?: UploadsConfig | false;
}

interface PickedFile {
	id: string;
	dragText: string;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		fileDialog: {
			/**
			 * Opens the file dialog: edits the file tag at the selection, or inserts a new one
			 */
			openFileDialog: () => ReturnType;
			/**
			 * Uploads files (or opens the system file picker) and inserts the uploaded file's tag
			 */
			uploadFile: (files?: FileList) => ReturnType;
		};
	}
}

const restoreSelectionAt = (editor: Editor) => {
	const { selection } = editor.state;
	return (callback?: () => void) => {
		setTimeout(() => {
			const chain = editor.chain();
			if (selection instanceof NodeSelection) {
				chain.setNodeSelection(selection.from);
			} else {
				chain.setTextSelection({ from: selection.from, to: selection.to });
			}
			chain.focus(undefined, { scrollIntoView: false }).run();
			callback?.();
		});
	};
};

const findFileByReference = async (
	reference: string,
	type: string,
	endpoints: EndpointsConfig
): Promise<string | null> => {
	try {
		const response = await window.panel.api.post<{ id?: string }>(
			`${getFieldApiPath(endpoints)}/resolve-kirbytag`,
			{ reference, type }
		);
		return response.id || null;
	} catch {
		return null;
	}
};

const buildTag = async (
	file: PickedFile,
	fieldValues: Record<string, unknown> | undefined,
	originalReference: string | null,
	options: FileDialogOptions
): Promise<string> => {
	const { endpoints, kirbytagAttributes } = options;
	let content = await processKirbyTagApi(file.dragText, endpoints, window.panel);

	const values = Object.fromEntries(
		Object.entries(JSON.parse(JSON.stringify(fieldValues ?? {}))).filter(
			([, value]) => value !== null && value !== undefined && value !== ""
		)
	);

	if (!Object.keys(values).length && !originalReference) return content;

	try {
		const { _type, uuid, href, value, ...attributes } = parseKirbyTag(content, kirbytagAttributes);
		const reference = originalReference || uuid || href || value || "";
		content = generateKirbyTag(_type, reference, { ...attributes, ...values });
		return Object.keys(values).length
			? await processKirbyTagApi(content, endpoints, window.panel)
			: content;
	} catch {
		return content;
	}
};

const upload = async (editor: Editor, options: FileDialogOptions, files?: FileList): Promise<void> => {
	const panel = window.panel;
	const { endpoints = { field: "" }, uploads } = options;

	if (!uploads) {
		panel.notification.error(panel.t("tiptap.upload.error.disabled"));
		return;
	}

	const restoreSelection = restoreSelectionAt(editor);

	const insert = (tags: string[]) => {
		if (!tags.length) {
			panel.notification.error(panel.t("tiptap.upload.error.noData"));
			return;
		}
		editor.commands.insertContent(tags.join(" "));
	};

	const uploadOptions = buildUploadOptions(endpoints, uploads, panel, {
		cancel: () => restoreSelection(),
		error: (error) => {
			restoreSelection();
			const failed = panel.t("tiptap.upload.error.failed");
			panel.notification.error(error.message ? `${failed}: ${error.message}` : failed);
		},
		done: (tags) => restoreSelection(() => insert(tags)),
	});

	if (!files) {
		panel.upload.pick(uploadOptions);
		return;
	}

	// Files dropped onto the picker are already in hand: upload them
	// straight away, no OS picker and no confirm dialog. upload.done()
	// closes the still-open file dialog before insert runs.
	panel.upload.select(files, uploadOptions);
	await panel.upload.submit();

	const failed = panel.upload.files.find((file) => !file.completed);
	if (failed) {
		if (panel.upload.completed.length) await uploadOptions.on.done(panel.upload.completed);
		panel.upload.reset();
		uploadOptions.on.error?.(new Error(failed.error ?? ""));
	}
};

const openDialog = async (editor: Editor, options: FileDialogOptions): Promise<void> => {
	const panel = window.panel;
	const { endpoints = { field: "" }, files, kirbytagAttributes } = options;
	const context = getTagEditingContext(editor, isFileTag);
	const restoreSelection = restoreSelectionAt(editor);

	let initial: ParsedKirbyTag = { _type: "" };
	let value: string[] = [];

	if (context.isEditing && context.tagText) {
		initial = parseKirbyTag(context.tagText, kirbytagAttributes);
		const fileId = initial.uuid
			? await findFileByReference(initial.uuid, initial._type, endpoints)
			: null;
		value = fileId ? [fileId] : [];
	}

	const { _type, uuid, href, value: tagValue, ...attributes } = initial;
	const fields = buildDialogFields({}, files?.fields as Record<string, DialogFieldConfig>);

	editor.view.dom.blur();

	panel.dialog.open({
		component: "tiptap-file-dialog",
		props: {
			multiple: false,
			endpoint: `${endpoints.field}/files`,
			value,
			fields,
			initialFieldValues: processFieldValues(attributes, fields),
			submitButton: panel.t(context.isEditing ? "change" : "insert"),
			uploads: options.uploads,
		},
		on: {
			cancel: () => restoreSelection(),
			drop: (files: FileList) => upload(editor, options, files),
			submit: (picked: PickedFile[], fieldValues?: Record<string, unknown>) => {
				if (!picked?.length) {
					panel.notification.error(panel.t("error.validation.required"));
					return;
				}

				panel.dialog.close();

				restoreSelection(async () => {
					const file = picked[0];
					// Same file as before: keep the original reference so
					// editing attributes doesn't rewrite filename → UUID
					const originalReference =
						context.isEditing && initial.uuid && value[0] === file.id ? initial.uuid : null;
					const content = await buildTag(file, fieldValues, originalReference, options);

					if (context.isEditing && context.replaceRange) {
						replaceTag(editor, context.replaceRange, content);
					} else {
						editor.commands.insertContent(content);
					}
				});
			},
		},
	});
};

export const FileDialog = Extension.create<FileDialogOptions>({
	name: "fileDialog",

	addOptions() {
		return {
			endpoints: undefined,
			files: undefined,
			kirbytagAttributes: undefined,
			uploads: false,
		};
	},

	addCommands() {
		return {
			openFileDialog:
				() =>
				({ editor, dispatch }) => {
					if (dispatch) openDialog(editor, this.options);
					return true;
				},
			uploadFile:
				(files) =>
				({ editor, dispatch }) => {
					if (dispatch) upload(editor, this.options, files);
					return true;
				},
		};
	},
});
