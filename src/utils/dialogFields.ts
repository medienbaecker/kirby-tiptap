import type { DialogFieldConfig, EndpointsConfig } from "../types";
import { getFieldApiPath } from "./kirbyTags";

/**
 * Processes initial field values to match expected field types
 * Converts strings to arrays for checkboxes/multiselect/tags, handles toggles
 */
export const processFieldValues = (
	initial: Record<string, unknown>,
	fields: Record<string, DialogFieldConfig> = {}
): Record<string, unknown> => {
	Object.entries(fields).forEach(([name, field]) => {
		if (!initial[name]) return;

		// Handle array field types
		if (['checkboxes', 'multiselect', 'tags'].includes(field.type)) {
			if (!Array.isArray(initial[name])) {
				initial[name] = typeof initial[name] === 'string'
					? (initial[name] as string).split(/\s+/)
					: [];
			}
		}

		// Handle toggle/boolean fields
		if (field.type === 'toggle' && typeof initial[name] === 'string') {
			initial[name] = (initial[name] as string).toLowerCase() === 'true';
		}
	});

	return initial;
};

const isTiptap = (field?: DialogFieldConfig): boolean => field?.type === "tiptap";

const withoutTagButtons = (buttons: unknown): unknown =>
	Array.isArray(buttons) ? buttons.filter((button) => button !== "link" && button !== "file") : buttons;

/**
 * A tiptap field in a dialog writes a tag attribute: inline Markdown,
 * with the endpoints of the field that opened the dialog, as dialog
 * fields have none of their own. It can't insert tags itself, since
 * a tag inside a tag attribute would end it
 */
export const dialogFields = (
	fields: Record<string, DialogFieldConfig> = {},
	endpoints?: EndpointsConfig
): Record<string, DialogFieldConfig> =>
	Object.fromEntries(
		Object.entries(fields).map(([name, field]) => [
			name,
			isTiptap(field)
				? { ...field, endpoints, format: "markdown", inline: true, buttons: withoutTagButtons(field.buttons), uploads: false }
				: field,
		])
	);

const convertTiptapValues = async (
	values: Record<string, unknown>,
	fields: Record<string, DialogFieldConfig>,
	convert: (value: string, field: DialogFieldConfig) => Promise<string | null>
): Promise<Record<string, unknown> | string> => {
	const converted = { ...values };

	for (const [name, value] of Object.entries(values)) {
		const field = fields[name];
		if (!isTiptap(field) || typeof value !== "string" || value.trim() === "") continue;

		const result = await convert(value, field);
		if (result === null) return name;
		converted[name] = result;
	}

	return converted;
};

/**
 * Tag attributes hold Markdown; tiptap dialog fields edit documents
 */
export const tiptapValuesFromMarkdown = async (
	values: Record<string, unknown>,
	fields: Record<string, DialogFieldConfig>,
	endpoints: EndpointsConfig
): Promise<Record<string, unknown>> =>
	(await convertTiptapValues(values, fields, async (markdown, field) => {
		const response = await window.panel.api.post<{ document: string }>(
			`${getFieldApiPath(endpoints)}/from-markdown`,
			{ markdown, buttons: field.buttons }
		);
		return response.document;
	})) as Record<string, unknown>;

/**
 * The values with each tiptap field's document as inline Markdown, or
 * the name of the first field that Markdown can't express
 */
export const tiptapValuesToMarkdown = (
	values: Record<string, unknown>,
	fields: Record<string, DialogFieldConfig>,
	endpoints: EndpointsConfig
): Promise<Record<string, unknown> | string> =>
	convertTiptapValues(values, fields, async (document, field) => {
		const response = await window.panel.api.post<{ markdown: string | null }>(
			`${getFieldApiPath(endpoints)}/to-markdown`,
			{ document, buttons: field.buttons }
		);
		return response.markdown;
	});

const opening = new WeakSet<object>();

/**
 * Opens one dialog per editor at a time: a second click while the
 * first one still loads its values is ignored
 */
export const openOnce = async (editor: object, open: () => Promise<void>): Promise<void> => {
	if (opening.has(editor)) return;
	opening.add(editor);
	try {
		await open();
	} finally {
		opening.delete(editor);
	}
};

/**
 * The dialog's fields plus the tag it writes, as a hidden value: a
 * blueprint field shows for some tags only with Kirby's `when: { tag: image }`
 */
export const withTagField = (
	fields: Record<string, DialogFieldConfig>
): Record<string, DialogFieldConfig> => ({ ...fields, tag: { type: "hidden" } });

/**
 * The values of the fields `when` shows for the tag. Kirby hides the
 * others but still submits them, and the tag couldn't read them
 */
export const visibleValues = (
	fields: Record<string, DialogFieldConfig>,
	values: Record<string, unknown>,
	tag: string,
	isVisible: (field: DialogFieldConfig, values: Record<string, unknown>) => boolean
): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(values).filter(
			([name]) => name !== "tag" && (!fields[name] || isVisible(fields[name], { ...values, tag }))
		)
	);
