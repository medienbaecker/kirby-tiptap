<template>
	<ToolbarButton icon="url" :title="$t('toolbar.button.link')" :editor="editor" :command="handleLink"
		:active-check="isLinkActive" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { parseKirbyTag, generateKirbyTag, findParentWithClass } from '../../utils/kirbyTags';

/**
 * Normalizes options objects to arrays for the link dialog
 * @param {Object|Array} options - Field options to normalize
 * @returns {Array} Normalized array of {value, text} objects
 */
const normalizeOptions = options => {
	if (Array.isArray(options)) return options;
	if (options && typeof options === 'object') {
		return Object.entries(options).map(([value, text]) => ({ value, text }));
	}
	return [];
};

export default {
	components: {
		ToolbarButton
	},

	props: {
		editor: {
			type: Object,
			required: true
		},
		links: {
			type: Object,
			default: () => ({})
		}
	},

	methods: {
		/**
		 * Validates input and determines its type (email, URL, phone, or plain text)
		 * @param {string} text - Text to validate
		 * @returns {Object} Object with type and href/text properties
		 */
		validateInput(text) {
			// Email validation
			if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
				return { type: 'email', href: `mailto:${text}` };
			}

			// Phone validation
			const phoneRegex = /^[\d\+\-\s\(\)]+$/;
			if (phoneRegex.test(text) && text.replace(/[^\d]/g, '').length >= 5) {
				return { type: 'tel', href: `tel:${text.trim()}` };
			}

			// URL validation
			try {
				new URL(text);
				if (text.startsWith('http://') || text.startsWith('https://')) {
					return { type: 'url', href: text };
				}
			} catch { }

			// Plain text (not recognized as any special type)
			return { type: 'text', text };
		},

		/**
		 * Converts field values into a formatted Kirby tag string
		 * @param {Object} values - Values from the link dialog
		 * @returns {string} Formatted Kirbytag
		 */
		generateTag(values) {
			const { href, text, _type, ...attrs } = values; // Exclude _type from attributes

			// Determine tag type based on href
			let type = 'link';
			let mainValue = href;

			if (href.startsWith('mailto:')) {
				type = 'email';
				mainValue = href.replace('mailto:', '');
			} else if (href.startsWith('tel:')) {
				type = 'tel';
				mainValue = href.replace('tel:', '');
			}

			// Use the shared utility
			return generateKirbyTag(type, mainValue, { text, ...attrs });
		},

		/**
		 * Handles the link button click - opens dialog for creating or editing links
		 * @param {Object} editor - The Tiptap editor instance
		 */
		handleLink(editor) {
			const { state, view } = editor;
			const { from, to, empty } = state.selection;

			// Check if we're editing an existing tag
			let isEditing = false;
			let tagEl = null;
			let replaceRange = null;
			let initial = {};

			// Case 1: Cursor inside a tag
			if (empty) {
				const { node } = view.domAtPos(from);
				tagEl = findParentWithClass(node, 'kirbytag');
				isEditing = Boolean(tagEl) && (
					tagEl.textContent.startsWith('(link:') ||
					tagEl.textContent.startsWith('(email:') ||
					tagEl.textContent.startsWith('(tel:')
				);
			}
			// Case 2: Selection
			else {
				// First check if the selection is a complete tag
				const selectedText = state.doc.textBetween(from, to).trim();

				// Check for complete tags of different types
				if (
					(selectedText.startsWith('(link:') && selectedText.endsWith(')')) ||
					(selectedText.startsWith('(email:') && selectedText.endsWith(')')) ||
					(selectedText.startsWith('(tel:') && selectedText.endsWith(')'))
				) {
					isEditing = true;
					replaceRange = { from, to };

					try {
						initial = parseKirbyTag(selectedText);

						// Set href properly based on tag type
						if (initial._type === 'email') {
							initial.href = 'mailto:' + initial.href;
						} else if (initial._type === 'tel') {
							initial.href = 'tel:' + initial.href;
						}
					} catch (e) {
						console.error("Error parsing tag:", e);
						isEditing = false;
					}
				}
				// Check if selection intersects with a tag
				else {
					// Check if selection starts inside a tag
					const { node: startNode } = view.domAtPos(from);
					const startTagEl = findParentWithClass(startNode, 'kirbytag');
					if (startTagEl) {
						const txt = startTagEl.textContent;
						if (txt.startsWith('(link:') || txt.startsWith('(email:') || txt.startsWith('(tel:')) {
							isEditing = true;
							tagEl = startTagEl;
						}
					}

					// If not starting in a tag, check if it ends in one
					if (!isEditing) {
						const { node: endNode } = view.domAtPos(to);
						const endTagEl = findParentWithClass(endNode, 'kirbytag');
						if (endTagEl) {
							const txt = endTagEl.textContent;
							if (txt.startsWith('(link:') || txt.startsWith('(email:') || txt.startsWith('(tel:')) {
								isEditing = true;
								tagEl = endTagEl;
							}
						}
					}
				}
			}

			// If editing via cursor position or partial tag selection, get the tag range
			if (isEditing && tagEl && !replaceRange) {
				const start = view.posAtDOM(tagEl, 0);
				const end = view.posAtDOM(tagEl, tagEl.childNodes.length);
				replaceRange = { from: start, to: end };

				try {
					initial = parseKirbyTag(tagEl.textContent);

					// Set href properly based on tag type
					if (initial._type === 'email') {
						initial.href = 'mailto:' + initial.href;
					} else if (initial._type === 'tel') {
						initial.href = 'tel:' + initial.href;
					}
				} catch (e) {
					console.error("Error parsing tag:", e);
					isEditing = false;
				}
			}

			// If not editing, handle selection as new link
			if (!isEditing) {
				const selText = !empty ? state.doc.textBetween(from, to) : '';
				const { type, href, text } = this.validateInput(selText);
				initial = type === 'text' ? { href: '', text: selText } : { href, text: '' };
			}

			// Add a null check before using Object.entries with this.linkFields
			const fields = this.linkFields || {};

			// Process field values based on field types
			Object.entries(fields).forEach(([name, field]) => {
				if (!initial[name]) return;

				// Handle array field types
				if (['checkboxes', 'multiselect', 'tags'].includes(field.type)) {
					if (!Array.isArray(initial[name])) {
						initial[name] = typeof initial[name] === 'string'
							? initial[name].split(/\s+/)
							: [];
					}
				}

				// Handle toggle/boolean fields
				if (field.type === 'toggle' && typeof initial[name] === 'string') {
					initial[name] = initial[name].toLowerCase() === 'true';
				}
			});

			// Open the dialog
			this.$panel.dialog.open({
				component: 'k-link-dialog',
				props: {
					fields: this.linkFields,
					value: initial,
					submitButton: window.panel.$t('insert')
				},
				on: {
					cancel: () => {
						this.$panel.dialog.close();
						editor.chain().focus().run();
					},
					submit: (values) => {
						if (!values.href) {
							this.$panel.notification.error(
								window.panel.$t('error.validation.required')
							);
							return;
						}

						this.$panel.dialog.close();

						// Convert permalinks to UUIDs
						values.href = values.href
							.replace("/@/file/", "file://")
							.replace("/@/page/", "page://");

						const kirbyTag = this.generateTag(values);
						const chain = editor.chain().focus();

						// Insert or update the tag
						if (isEditing && replaceRange) {
							chain.deleteRange(replaceRange).insertContent(kirbyTag).run();
						} else {
							chain.insertContent(kirbyTag).run();
						}
					}
				}
			});
		},

		/**
		 * Checks if the cursor is positioned within a link tag
		 * @param {Object} editor - The Tiptap editor instance
		 * @returns {boolean} Whether a link tag is active
		 */
		isLinkActive(editor) {
			if (!editor.isFocused) return false;

			const { from, to, empty } = editor.state.selection;

			// Case 1: Cursor inside a tag
			if (empty) {
				const { node } = editor.view.domAtPos(from);
				const tagEl = findParentWithClass(node, 'kirbytag');
				if (!tagEl) return false;

				const txt = tagEl.textContent;
				return (
					txt.startsWith('(link:') ||
					txt.startsWith('(email:') ||
					txt.startsWith('(tel:')
				);
			}
			// Case 2: Selection
			else {
				// First check if the exact selection might be a complete tag
				const selectedText = editor.state.doc.textBetween(from, to).trim();
				if (
					(selectedText.startsWith('(link:') && selectedText.endsWith(')')) ||
					(selectedText.startsWith('(email:') && selectedText.endsWith(')')) ||
					(selectedText.startsWith('(tel:') && selectedText.endsWith(')'))
				) {
					return true;
				}

				// If not, check if any endpoint of the selection is inside a link tag
				const { node: startNode } = editor.view.domAtPos(from);
				const startTagEl = findParentWithClass(startNode, 'kirbytag');
				if (startTagEl) {
					const txt = startTagEl.textContent;
					if (txt.startsWith('(link:') || txt.startsWith('(email:') || txt.startsWith('(tel:')) {
						return true;
					}
				}

				const { node: endNode } = editor.view.domAtPos(to);
				const endTagEl = findParentWithClass(endNode, 'kirbytag');
				if (endTagEl) {
					const txt = endTagEl.textContent;
					if (txt.startsWith('(link:') || txt.startsWith('(email:') || txt.startsWith('(tel:')) {
						return true;
					}
				}

				return false;
			}
		}
	},

	computed: {
		/**
		 * Builds the field configuration for the link dialog
		 * @returns {Object} Configuration for link dialog fields
		 */
		linkFields() {
			// Configure the href field with options if provided
			const hrefField = {
				label: window.panel.$t('link'),
				required: true,
				type: 'link'
			};

			if (this.links.options?.length) {
				hrefField.options = this.links.options;
			}

			// Default fields (href and text)
			const defaults = {
				href: hrefField,
				text: { label: window.panel.$t('link.text'), type: 'text' }
			};

			// Process custom fields, normalizing their options
			const custom = Object.fromEntries(
				Object.entries(this.links.fields || {}).map(([name, field]) => {
					const f = { ...field };
					if (field.options) {
						f.options = normalizeOptions(field.options);
					}
					return [name, f];
				})
			);

			return { ...defaults, ...custom };
		}
	}
};
</script>
