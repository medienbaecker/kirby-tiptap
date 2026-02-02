<template>
	<ToolbarButton icon="url" :title="$t('toolbar.button.link')" :editor="editor" :command="handleLink"
		:active-check="isLinkActive" shortcut="Mod-k" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { parseKirbyTag, findTagAtPos, isLinkTag, isCompleteLinkTag } from '../../utils/kirbyTags';
import { validateInput, generateLinkTag } from '../../utils/inputValidation';
import { buildDialogFields, processFieldValues } from '../../utils/dialogFields';
import { processKirbyTagApi } from '../../utils/eventHandlers';

export default {
	components: {
		ToolbarButton
	},

	props: {
		editor: {
			type: Object,
			required: true
		},
		endpoints: {
			type: Object,
			default: () => ({})
		},
		links: {
			type: Object,
			default: () => ({})
		},
		uuid: {
			type: Object,
			default: () => ({ pages: true, files: true })
		}
	},

	methods: {
		/**
		 * Handles the link button click - opens dialog for creating or editing links
		 * @param {Object} editor - The Tiptap editor instance
		 */
		handleLink(editor) {
			const editingContext = this.getEditingContext(editor);
			const initialValues = this.prepareInitialValues(editingContext);
			this.openLinkDialog(editor, editingContext, initialValues);
		},

		/**
		 * Determines if we're editing an existing tag and extracts context
		 * @param {Object} editor - The Tiptap editor instance
		 * @returns {Object} Context object with editing state and tag information
		 */
		getEditingContext(editor) {
			const { state, view } = editor;
			const { from, to, empty } = state.selection;

			if (empty) {
				return this.checkCursorInTag(view, from);
			} else {
				return this.checkSelectionForTag(state, view, from, to);
			}
		},

		/**
		 * Checks if cursor is positioned inside a link tag
		 * @param {Object} view - Editor view
		 * @param {number} from - Cursor position
		 * @returns {Object} Context object
		 */
		checkCursorInTag(view, from) {
			const tagEl = findTagAtPos(view, from, 'kirbytag');

			if (tagEl && isLinkTag(tagEl.textContent)) {
				return {
					isEditing: true,
					tagEl,
					replaceRange: this.getTagRange(view, tagEl),
					tagText: tagEl.textContent
				};
			}

			return { isEditing: false };
		},

		/**
		 * Checks if selection contains or intersects with a link tag
		 * @param {Object} state - Editor state
		 * @param {Object} view - Editor view
		 * @param {number} from - Selection start
		 * @param {number} to - Selection end
		 * @returns {Object} Context object
		 */
		checkSelectionForTag(state, view, from, to) {
			const selectedText = state.doc.textBetween(from, to).trim();

			// Check if selection is a complete tag
			if (isCompleteLinkTag(selectedText)) {
				return {
					isEditing: true,
					replaceRange: { from, to },
					tagText: selectedText
				};
			}

			// Check if selection intersects with a tag
			const tagEl = this.findIntersectingTag(view, from, to);
			if (tagEl) {
				return {
					isEditing: true,
					tagEl,
					replaceRange: this.getTagRange(view, tagEl),
					tagText: tagEl.textContent
				};
			}

			return { isEditing: false, selectedText };
		},

		/**
		 * Finds a tag element that intersects with the selection
		 * @param {Object} view - Editor view
		 * @param {number} from - Selection start
		 * @param {number} to - Selection end
		 * @returns {Element|null} Tag element or null
		 */
		findIntersectingTag(view, from, to) {
			const startTagEl = findTagAtPos(view, from, 'kirbytag');
			if (startTagEl && isLinkTag(startTagEl.textContent)) {
				return startTagEl;
			}

			const endTagEl = findTagAtPos(view, to, 'kirbytag');
			if (endTagEl && isLinkTag(endTagEl.textContent)) {
				return endTagEl;
			}

			return null;
		},

		/**
		 * Gets the range (from/to positions) of a tag element
		 * @param {Object} view - Editor view
		 * @param {Element} tagEl - Tag element
		 * @returns {Object} Range object with from and to positions
		 */
		getTagRange(view, tagEl) {
			const start = view.posAtDOM(tagEl.firstElement, 0);
			const end = view.posAtDOM(tagEl.lastElement, tagEl.childNodes.length);
			return { from: start, to: end };
		},

		/**
		 * Prepares initial values for the link dialog
		 * @param {Object} context - Editing context
		 * @returns {Object} Initial values for dialog fields
		 */
		prepareInitialValues(context) {
			let initial = {};

			if (context.isEditing && context.tagText) {
				initial = this.parseExistingTag(context.tagText);
			} else {
				initial = this.createNewLinkValues(context.selectedText || '');
			}

			return processFieldValues(initial, this.linkFields);
		},

		/**
		 * Parses an existing KirbyTag and returns its values
		 * @param {string} tagText - The KirbyTag text
		 * @returns {Object} Parsed tag values
		 */
		parseExistingTag(tagText) {
			try {
				const parsed = parseKirbyTag(tagText);

				// Normalize href based on tag type
				if (parsed._type === 'email') {
					parsed.href = 'mailto:' + parsed.href;
				} else if (parsed._type === 'tel') {
					parsed.href = 'tel:' + parsed.href;
				}

				return parsed;
			} catch {
				return {};
			}
		},

		/**
		 * Creates initial values for a new link from selected text
		 * @param {string} selectedText - The selected text
		 * @returns {Object} Initial values
		 */
		createNewLinkValues(selectedText) {
			const allowedTypes = this.links.options || [];
			const { type, href, text } = validateInput(selectedText, allowedTypes);
			return type === 'unknown'
				? { href: '', text: selectedText }
				: { href, text: '' };
		},

		/**
		 * Opens the link dialog with appropriate handlers
		 * @param {Object} editor - Editor instance
		 * @param {Object} context - Editing context
		 * @param {Object} initialValues - Initial dialog values
		 */
		openLinkDialog(editor, context, initialValues) {
			this.$panel.dialog.open({
				component: 'k-link-dialog',
				props: {
					fields: this.linkFields,
					value: initialValues,
					submitButton: window.panel.$t('insert')
				},
				on: {
					cancel: () => this.handleDialogCancel(editor),
					submit: (values) => this.handleDialogSubmit(editor, context, values)
				}
			});
		},

		/**
		 * Handles dialog cancellation
		 * @param {Object} editor - Editor instance
		 */
		handleDialogCancel(editor) {
			this.$panel.dialog.close();
			editor.chain().focus().run();
		},

		/**
		 * Handles dialog form submission
		 * @param {Object} editor - Editor instance
		 * @param {Object} context - Editing context
		 * @param {Object} values - Form values
		 */
		async handleDialogSubmit(editor, context, values) {
			if (!values.href) {
				this.$panel.notification.error(
					window.panel.$t('error.validation.required')
				);
				return;
			}

			this.$panel.dialog.close();

			// Convert permalinks to page:// or file:// format
			values.href = values.href.replace("/@/page/", "page://");
			values.href = values.href.replace("/@/file/", "file://");

			let kirbyTag = generateLinkTag(values);
			
			// Process the KirbyTag through API for UUID conversion
			kirbyTag = await processKirbyTagApi(kirbyTag, this.endpoints, this.$panel);

			const chain = editor.chain().focus();

			// Insert or update the tag
			if (context.isEditing && context.replaceRange) {
				chain.deleteRange(context.replaceRange).insertContent(kirbyTag).run();
			} else {
				chain.insertContent(kirbyTag).run();
			}
		},

		/**
		 * Checks if the cursor is positioned within a link tag
		 * @param {Object} editor - The Tiptap editor instance
		 * @returns {boolean} Whether a link tag is active
		 */
		isLinkActive(editor) {
			if (!editor.isFocused) return false;

			const { from, to, empty } = editor.state.selection;

			if (empty) {
				const tagEl = findTagAtPos(editor.view, from, 'kirbytag');
				return tagEl ? isLinkTag(tagEl.textContent) : false;
			}
			else {
				const selectedText = editor.state.doc.textBetween(from, to).trim();
				if (isCompleteLinkTag(selectedText)) {
					return true;
				}

				const startTagEl = findTagAtPos(editor.view, from, 'kirbytag');
				if (startTagEl && isLinkTag(startTagEl.textContent)) {
					return true;
				}

				const endTagEl = findTagAtPos(editor.view, to, 'kirbytag');
				if (endTagEl && isLinkTag(endTagEl.textContent)) {
					return true;
				}

				return false;
			}
		},

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
			const defaultFields = {
				href: hrefField,
				text: { label: window.panel.$t('link.text'), type: 'text' }
			};

			return buildDialogFields(defaultFields, this.links.fields);
		}
	}
};
</script>
