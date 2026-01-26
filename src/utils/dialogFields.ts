import type { DialogOption, DialogFieldConfig } from "../types";

/**
 * Normalizes options objects to arrays for dialog fields
 */
export const normalizeOptions = (
	options: Record<string, string> | DialogOption[] | undefined
): DialogOption[] => {
	if (Array.isArray(options)) return options;
	if (options && typeof options === 'object') {
		return Object.entries(options).map(([value, text]) => ({ value, text }));
	}
	return [];
};

/**
 * Builds dialog field configuration by merging default fields with custom fields
 */
export const buildDialogFields = (
	defaultFields: Record<string, DialogFieldConfig> = {},
	customFields: Record<string, DialogFieldConfig> | null | undefined = {}
): Record<string, DialogFieldConfig> => {
	// Guard against null/undefined
	if (!customFields) {
		return { ...defaultFields };
	}

	// Process custom fields, normalizing their options
	const processedCustomFields = Object.fromEntries(
		Object.entries(customFields).map(([name, field]) => {
			const processedField = { ...field };
			if (field.options) {
				processedField.options = normalizeOptions(
					field.options as Record<string, string> | DialogOption[]
				);
			}
			return [name, processedField];
		})
	);

	// Merge default fields with processed custom fields
	return { ...defaultFields, ...processedCustomFields };
};

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
