/**
 * Normalizes options objects to arrays for dialog fields
 * @param {Object|Array} options - Field options to normalize
 * @returns {Array} Normalized array of {value, text} objects
 */
export const normalizeOptions = options => {
	if (Array.isArray(options)) return options;
	if (options && typeof options === 'object') {
		return Object.entries(options).map(([value, text]) => ({ value, text }));
	}
	return [];
};

/**
 * Builds dialog field configuration by merging default fields with custom fields
 * @param {Object} defaultFields - Default field configuration
 * @param {Object} customFields - Custom field configuration from props
 * @returns {Object} Merged field configuration
 */
export const buildDialogFields = (defaultFields = {}, customFields = {}) => {
	// Process custom fields, normalizing their options
	const processedCustomFields = Object.fromEntries(
		Object.entries(customFields).map(([name, field]) => {
			const processedField = { ...field };
			if (field.options) {
				processedField.options = normalizeOptions(field.options);
			}
			return [name, processedField];
		})
	);

	// Merge default fields with processed custom fields
	return { ...defaultFields, ...processedCustomFields };
};