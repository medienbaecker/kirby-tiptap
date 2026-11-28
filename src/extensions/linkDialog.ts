import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { parseKirbyTag, isLinkTag, getTagEditingContext, processKirbyTagApi, replaceTag, unsavableValue, invalidField } from "../utils/kirbyTags";
import type { TagEditingContext } from "../utils/kirbyTags";
import { validateInput, generateLinkTag, splitHref } from "../utils/inputValidation";
import {
	dialogFields,
	inlineContentFromMarkdown,
	withSchemaMarks,
	isTiptap,
	openOnce,
	processFieldValues,
	tiptapValuesFromMarkdown,
	tiptapValuesFromText,
	tiptapValuesToMarkdown,
} from "../utils/dialogFields";
import type { DialogFieldConfig, EndpointsConfig, KirbytagsMap, LinksConfig } from "../types";

interface LinkDialogOptions {
	endpoints?: EndpointsConfig;
	format?: "json" | "markdown";
	links?: LinksConfig;
	kirbytagAttributes?: KirbytagsMap;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		linkDialog: {
			/**
			 * Opens the link dialog: edits the link tag at the selection, or inserts a new one
			 */
			openLinkDialog: () => ReturnType;
		};
	}
}

const buildFields = (links: LinksConfig = {}): Record<string, DialogFieldConfig> => {
	const panel = window.panel;
	const href: DialogFieldConfig = {
		label: panel.t("link"),
		required: true,
		type: "link",
	};

	if (links.options?.length) {
		href.options = links.options;
	}

	return {
		href,
		text: { label: panel.t("link.text"), type: "text" },
		...(links.fields as Record<string, DialogFieldConfig>),
	};
};

const initialValues = (
	context: TagEditingContext,
	options: LinkDialogOptions
): Record<string, unknown> => {
	if (context.isEditing && context.tagText) {
		const parsed = parseKirbyTag(context.tagText, options.kirbytagAttributes);

		// Normalize href based on tag type
		if (parsed._type === "email") parsed.href = "mailto:" + parsed.href;
		if (parsed._type === "tel") parsed.href = "tel:" + parsed.href;

		return parsed;
	}

	const selectedText = context.selectedText || "";
	const input = validateInput(selectedText, options.links?.options || []);
	return input.type === "unknown" ? { href: "", text: selectedText } : { href: input.href, text: "" };
};

const prepare = async (
	editor: Editor,
	options: LinkDialogOptions,
	fields: Record<string, DialogFieldConfig>,
	endpoints: EndpointsConfig
): Promise<{ context: TagEditingContext; value: Record<string, unknown> }> => {
	const doc = editor.state.doc;
	const context = getTagEditingContext(editor, isLinkTag);
	const initial = processFieldValues(initialValues(context, options), fields);
	const value = context.isEditing
		? await tiptapValuesFromMarkdown(initial, fields, endpoints)
		: tiptapValuesFromText(initial, fields);

	return editor.state.doc === doc ? { context, value } : prepare(editor, options, fields, endpoints);
};

const openDialog = async (editor: Editor, options: LinkDialogOptions): Promise<void> => {
	const panel = window.panel;
	const endpoints = options.endpoints ?? { field: "" };
	const fields = dialogFields(buildFields(options.links), endpoints);
	const { context, value } = await prepare(editor, options, fields, endpoints);
	let submitting = false;
	let cancelled = false;

	panel.dialog.open({
		component: "tiptap-link-dialog",
		props: {
			fields,
			value,
			submitButton: panel.t(context.isEditing ? "change" : "insert"),
			removable: context.isEditing,
		},
		on: {
			cancel: () => {
				cancelled = true;
				panel.dialog.close();
				editor.chain().focus().run();
			},
			remove: async () => {
				panel.dialog.close();

				if (!context.replaceRange || !context.tagText) {
					editor.chain().focus().run();
					return;
				}

				const { text } = parseKirbyTag(context.tagText, options.kirbytagAttributes);
				const content = !text
					? ""
					: isTiptap(fields.text)
						? withSchemaMarks(editor, await inlineContentFromMarkdown(text, fields.text, endpoints))
						: { type: "text", text };
				editor.chain().focus().deleteRange(context.replaceRange).insertContent(content).run();
			},
			submit: async (submitted: { href: string; [key: string]: string }) => {
				if (!submitted.href) {
					panel.notification.error(panel.t("error.validation.required"));
					return;
				}

				if (submitting) return;
				submitting = true;
				const converted = await tiptapValuesToMarkdown(submitted, fields, endpoints).finally(() => {
					submitting = false;
				});
				if (cancelled) return;
				if (typeof converted === "string") {
					panel.notification.error(invalidField(converted, fields));
					return;
				}
				const values = converted as typeof submitted;

				const { type, mainValue } = splitHref(values.href);
				const unsavable = unsavableValue(
					type,
					{ ...values, href: mainValue },
					fields,
					options.kirbytagAttributes,
					options.format
				);
				if (unsavable) {
					panel.notification.error(unsavable);
					return;
				}

				panel.dialog.close();

				// Convert permalinks to page:// or file:// format
				values.href = values.href.replace("/@/page/", "page://").replace("/@/file/", "file://");

				const kirbyTag = await processKirbyTagApi(generateLinkTag(values), options.endpoints, panel);
				if (context.isEditing && context.replaceRange) {
					replaceTag(editor, context.replaceRange, kirbyTag);
				} else {
					editor.chain().focus().insertContent({ type: "text", text: kirbyTag }).run();
				}
			},
		},
	});
};

export const LinkDialog = Extension.create<LinkDialogOptions>({
	name: "linkDialog",

	addOptions() {
		return {
			endpoints: undefined,
			format: undefined,
			links: undefined,
			kirbytagAttributes: undefined,
		};
	},

	addCommands() {
		return {
			openLinkDialog:
				() =>
				({ editor, dispatch }) => {
					if (dispatch) openOnce(editor, () => openDialog(editor, this.options));
					return true;
				},
		};
	},
});
