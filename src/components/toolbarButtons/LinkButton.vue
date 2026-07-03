<template>
	<ToolbarButton icon="url" :title="$t('toolbar.button.link')" :editor="editor" :command="handleLink"
		:active-check="isLinkActive" :disabled-check="kirbyTagDisabledCheck" shortcut="Mod-k" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { parseKirbyTag, isLinkTag, getTagEditingContext, isTagActive } from '../../utils/kirbyTags';
import { validateInput, generateLinkTag } from '../../utils/inputValidation';
import { buildDialogFields, processFieldValues } from '../../utils/dialogFields';
import { processKirbyTagApi } from '../../utils/eventHandlers';
import { kirbyTagDisabledCheck } from '../../extensions/insertionGuards';

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
		kirbytags: {
			type: Object,
			default: () => ({})
		}
	},

	methods: {
		/**
		 * Handles the link button click - opens dialog for creating or editing links
		 * @param {Object} editor - The Tiptap editor instance
		 */
		handleLink(editor) {
			const editingContext = getTagEditingContext(editor, isLinkTag);
			const initialValues = this.prepareInitialValues(editingContext);
			this.openLinkDialog(editor, editingContext, initialValues);
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
				const parsed = parseKirbyTag(tagText, this.kirbytags);

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
				component: 'tiptap-link-dialog',
				props: {
					fields: this.linkFields,
					value: initialValues,
					submitButton: window.panel.$t(context.isEditing ? 'change' : 'insert'),
					removable: context.isEditing
				},
				on: {
					cancel: () => this.handleDialogCancel(editor),
					submit: (values) => this.handleDialogSubmit(editor, context, values),
					remove: () => this.handleDialogRemove(editor, context)
				}
			});
		},

		/**
		 * Handles removing a KirbyTag, replacing it with its text value
		 * @param {Object} editor - Editor instance
		 * @param {Object} context - Editing context
		 */
		handleDialogRemove(editor, context) {
			this.$panel.dialog.close();

			if (context.replaceRange) {
				try {
					const parsed = parseKirbyTag(context.tagText, this.kirbytags);
					const text = parsed.text || '';
					editor.chain().focus()
						.deleteRange(context.replaceRange)
						.insertContent(text)
						.run();
				} catch {
					editor.chain().focus()
						.deleteRange(context.replaceRange)
						.run();
				}
			} else {
				editor.chain().focus().run();
			}
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

		kirbyTagDisabledCheck,

		isLinkActive(editor) {
			return isTagActive(editor, isLinkTag);
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
