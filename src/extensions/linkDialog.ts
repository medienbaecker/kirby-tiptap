import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { parseKirbyTag, isLinkTag, getTagEditingContext, processKirbyTagApi, replaceTag } from "../utils/kirbyTags";
import type { TagEditingContext } from "../utils/kirbyTags";
import { validateInput, generateLinkTag } from "../utils/inputValidation";
import { buildDialogFields, processFieldValues } from "../utils/dialogFields";
import type { DialogFieldConfig, EndpointsConfig, KirbytagsMap, LinksConfig } from "../types";

interface LinkDialogOptions {
	endpoints?: EndpointsConfig;
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

	return buildDialogFields(
		{ href, text: { label: panel.t("link.text"), type: "text" } },
		links.fields as Record<string, DialogFieldConfig>
	);
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

const openDialog = (editor: Editor, options: LinkDialogOptions): void => {
	const panel = window.panel;
	const context = getTagEditingContext(editor, isLinkTag);
	const fields = buildFields(options.links);

	editor.view.dom.blur();

	panel.dialog.open({
		component: "tiptap-link-dialog",
		props: {
			fields,
			value: processFieldValues(initialValues(context, options), fields),
			submitButton: panel.t(context.isEditing ? "change" : "insert"),
			removable: context.isEditing,
		},
		on: {
			cancel: () => {
				panel.dialog.close();
				editor.chain().focus().run();
			},
			remove: () => {
				panel.dialog.close();

				if (!context.replaceRange || !context.tagText) {
					editor.chain().focus().run();
					return;
				}

				const { text } = parseKirbyTag(context.tagText, options.kirbytagAttributes);
				editor.chain().focus().deleteRange(context.replaceRange).insertContent(text || "").run();
			},
			submit: async (values: { href: string; [key: string]: string }) => {
				if (!values.href) {
					panel.notification.error(panel.t("error.validation.required"));
					return;
				}

				panel.dialog.close();

				// Convert permalinks to page:// or file:// format
				values.href = values.href.replace("/@/page/", "page://").replace("/@/file/", "file://");

				const kirbyTag = await processKirbyTagApi(generateLinkTag(values), options.endpoints, panel);
				if (context.isEditing && context.replaceRange) {
					replaceTag(editor, context.replaceRange, kirbyTag);
				} else {
					editor.chain().focus().insertContent(kirbyTag).run();
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
			links: undefined,
			kirbytagAttributes: undefined,
		};
	},

	addCommands() {
		return {
			openLinkDialog:
				() =>
				({ editor, dispatch }) => {
					if (dispatch) openDialog(editor, this.options);
					return true;
				},
		};
	},
});
