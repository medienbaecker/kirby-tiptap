import type { DialogFieldConfig } from "../types";

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
