<template>
	<ToolbarButton icon="image" :title="$t('toolbar.button.file')" :editor="editor" :command="handleSelect"
		:active-check="isFileActive" :disabled-check="kirbyTagDisabledCheck" :dropdown="dropdownItems" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { parseKirbyTag, generateKirbyTag, getFieldApiPath, getTagEditingContext, isTagActive } from '../../utils/kirbyTags';
import { buildDialogFields, processFieldValues } from '../../utils/dialogFields';
import { processKirbyTagApi } from '../../utils/eventHandlers';
import { buildUploadOptions } from '../../utils/upload';
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
		uploads: {
			type: [Object, Boolean],
			default: false
		},
		files: {
			type: Object,
			default: () => ({})
		},
		kirbytags: {
			type: Object,
			default: () => ({})
		}
	},

	data() {
		return {
			isEditingFileTag: false
		}
	},

	mounted() {
		this.updateEditingFlag();
		this.editor.on('selectionUpdate', this.updateEditingFlag);
		this.editor.on('update', this.updateEditingFlag);
	},

	beforeUnmount() {
		this.editor.off('selectionUpdate', this.updateEditingFlag);
		this.editor.off('update', this.updateEditingFlag);
	},

	computed: {
		dropdownItems() {
			// Skip dropdown when editing an existing file kirbytag — clicking
			// the button should jump straight to the file picker so the user
			// can replace the existing file.
			if (this.isEditingFileTag) {
				return null;
			}
			// Only show dropdown if uploads are enabled
			if (!this.uploads) {
				return null;
			}

			const items = [{
				label: this.$t('toolbar.button.file.select'),
				icon: 'check',
				click: () => this.handleSelect()
			}];

			items.push({
				label: this.$t('toolbar.button.file.upload'),
				icon: 'upload',
				click: () => this.handleUpload()
			});

			return items;
		},

		fileFields() {
			return buildDialogFields({}, this.files.fields);
		}
	},

	methods: {
		updateEditingFlag() {
			this.isEditingFileTag = this.getFileEditingContext().isEditing;
		},

		/**
		 * Handles selecting existing files
		 */
		handleSelect() {
			const editingContext = this.getFileEditingContext();
			const restoreSelection = this.restoreSelectionCallback();
			this.processFileSelection(editingContext, restoreSelection);
		},

		/**
		 * Determines if we're editing an existing file tag and extracts context
		 * @returns {Object} Context object with editing state and tag information
		 */
		getFileEditingContext() {
			return getTagEditingContext(this.editor, this.isFileTag);
		},

		/**
		 * Processes file selection based on editing context
		 * @param {Object} context - Editing context
		 * @param {Function} restoreSelection - Selection restore callback
		 */
		processFileSelection(context, restoreSelection) {
			if (context.isEditing && context.tagText) {
				this.handleExistingFileTag(context, restoreSelection);
			} else {
				this.openFileDialog(restoreSelection, {}, [], false, null);
			}
		},

		/**
		 * Handles editing of an existing file tag
		 * @param {Object} context - Editing context
		 * @param {Function} restoreSelection - Selection restore callback
		 */
		handleExistingFileTag(context, restoreSelection) {
			try {
				const initial = parseKirbyTag(context.tagText, this.kirbytags);

				if (initial.uuid) {
					this.findFileByReference(initial.uuid, initial._type)
						.then(fileId => {
							const value = fileId ? [fileId] : [];
							this.openFileDialog(restoreSelection, initial, value, true, context.replaceRange);
						})
						.catch(() => {
							this.openFileDialog(restoreSelection, initial, [], true, context.replaceRange);
						});
				} else {
					this.openFileDialog(restoreSelection, initial, [], true, context.replaceRange);
				}
			} catch {
				this.openFileDialog(restoreSelection, {}, [], false, null);
			}
		},

		openFileDialog(restoreSelection, initial, value, isEditing, replaceRange) {
			const { _type, uuid, href, value: tagValue, ...fieldValues } = initial || {};
			const processedFieldValues = processFieldValues(fieldValues, this.fileFields);

			this.$panel.dialog.open({
				component: 'tiptap-file-dialog',
				props: {
					multiple: false,
					endpoint: `${this.endpoints.field}/files`,
					value: value,
					fields: this.fileFields,
					initialFieldValues: processedFieldValues,
					submitButton: window.panel.$t(isEditing ? 'change' : 'insert'),
					uploads: this.uploads
				},
				on: {
					cancel: restoreSelection,
					drop: (files) => this.handleUpload(files),
					submit: (files, fieldValues) => {
						if (!files?.length) {
							this.$panel.notification.error(
								window.panel.$t('error.validation.required')
							);
							return;
						}

						this.$panel.dialog.close();

						restoreSelection(async () => {
							const file = files[0];
							// Same file as before: keep the original reference so
							// editing attributes doesn't rewrite filename → UUID
							const originalReference =
								isEditing && initial?.uuid && value?.[0] === file.id
									? initial.uuid
									: null;
							let content = file.dragText;

							// Process UUID configuration via API
							content = await processKirbyTagApi(content, this.endpoints, this.$panel);

							if (fieldValues && Object.keys(fieldValues).length > 0) {
								try {
									const parsed = parseKirbyTag(content, this.kirbytags);
									const { _type, uuid, href, value: parsedValue, ...existingAttributes } = parsed;
									const plainFieldValues = JSON.parse(JSON.stringify(fieldValues));
									const filteredFieldValues = Object.fromEntries(
										Object.entries(plainFieldValues).filter(([, value]) =>
											value !== null && value !== undefined && value !== ''
										)
									);
									const enhanced = { ...existingAttributes, ...filteredFieldValues };
									const reference = originalReference || uuid || href || parsedValue;
									content = generateKirbyTag(_type, reference, enhanced);

									// Process the enhanced tag through API for UUID conversion
									content = await processKirbyTagApi(content, this.endpoints, this.$panel);
								} catch {
									// Fall back to unenhanced tag
								}
							} else if (originalReference) {
								try {
									const parsed = parseKirbyTag(content, this.kirbytags);
									const { _type, uuid, href, value: parsedValue, ...existingAttributes } = parsed;
									content = generateKirbyTag(_type, originalReference, existingAttributes);
								} catch {
									// Fall back to unenhanced tag
								}
							}

							if (isEditing && replaceRange) {
								this.editor.chain().focus()
									.deleteRange(replaceRange)
									.insertContent(content)
									.run();
							} else {
								this.editor.commands.insertContent(content);
							}
						});
					}
				}
			});
		},

		restoreSelectionCallback() {
			const { from, to } = this.editor.state.selection;
			return (callback) => {
				setTimeout(() => {
					this.editor.commands.setTextSelection({ from, to });
					if (callback) callback();
				});
			};
		},

		async findFileByReference(reference, type = 'file') {
			try {
				const response = await this.$panel.api.post(
					`${getFieldApiPath(this.endpoints)}/resolve-kirbytag`,
					{ reference, type }
				);
				return response.id || null;
			} catch (error) {
				return null;
			}
		},

		kirbyTagDisabledCheck,

		isFileTag(text) {
			return /^\((image|file|video):/i.test(text);
		},

		isFileActive(editor) {
			return isTagActive(editor, this.isFileTag);
		},

		handleUpload(files = null) {
			if (!this.uploads) {
				this.$panel.notification.error(this.$t('tiptap.upload.error.disabled'));
				return;
			}

			const restoreSelection = this.restoreSelectionCallback();
			const options = buildUploadOptions(this.endpoints, this.uploads, this.$panel, {
				cancel: () => restoreSelection(),
				error: (error) => {
					restoreSelection();
					this.$panel.notification.error(`${this.$t('tiptap.upload.error.failed')}: ${error.message ?? ''}`);
				},
				done: (file) => restoreSelection(() => this.insertUploadedFile(file)),
			});

			try {
				// Files dropped onto the picker are already in hand: upload them
				// straight away, no OS picker and no confirm dialog. upload.done()
				// closes the still-open file dialog before insertUploadedFile runs.
				if (files) {
					this.$panel.upload.select(files, options);
					this.$panel.upload.submit();
				} else {
					this.$panel.upload.pick(options);
				}
			} catch (error) {
				this.$panel.notification.error(`${this.$t('tiptap.upload.error.dialog')}: ${error.message}`);
				restoreSelection();
			}
		},

		async insertUploadedFile(file) {
			if (!file?.dragText) {
				this.$panel.notification.error(this.$t('tiptap.upload.error.noData'));
				return;
			}

			try {
				const content = await processKirbyTagApi(file.dragText, this.endpoints, this.$panel);
				this.editor.commands.insertContent(content);
			} catch (error) {
				this.$panel.notification.error(`${this.$t('tiptap.upload.error.insert')}: ${error.message}`);
			}
		},

	}
}
</script>