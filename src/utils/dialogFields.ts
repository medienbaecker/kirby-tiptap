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

/**
 * A tiptap field in a dialog writes a tag attribute: inline Markdown,
 * with the endpoints of the field that opened the dialog, as dialog
 * fields have none of their own
 */
export const dialogFields = (
	fields: Record<string, DialogFieldConfig> = {},
	endpoints?: EndpointsConfig
): Record<string, DialogFieldConfig> =>
	Object.fromEntries(
		Object.entries(fields).map(([name, field]) => [
			name,
			isTiptap(field) ? { ...field, endpoints, format: "markdown", inline: true } : field,
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
