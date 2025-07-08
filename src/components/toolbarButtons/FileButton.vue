<template>
	<ToolbarButton icon="image" :title="$t('toolbar.button.file')" :editor="editor" :command="handleSelect"
		:active-check="isFileActive" :dropdown="dropdownItems" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { parseKirbyTag, findParentWithClass } from '../../utils/kirbyTags';

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
		}
	},

	data() {
		return {
			editingContext: null // Store editing context for upload handler
		}
	},

	computed: {
		dropdownItems() {
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
		}
	},

	methods: {
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
			const { state, view } = this.editor;
			const { from, to, empty } = state.selection;

			if (empty) {
				return this.checkCursorInFileTag(view, from);
			} else {
				return this.checkSelectionForFileTag(state, view, from, to);
			}
		},

		/**
		 * Checks if cursor is positioned inside a file tag
		 * @param {Object} view - Editor view
		 * @param {number} from - Cursor position
		 * @returns {Object} Context object
		 */
		checkCursorInFileTag(view, from) {
			const { node } = view.domAtPos(from);
			const tagEl = findParentWithClass(node, 'kirbytag');

			if (tagEl && this.isFileTag(tagEl.textContent)) {
				return {
					isEditing: true,
					tagEl,
					replaceRange: this.getFileTagRange(view, tagEl),
					tagText: tagEl.textContent
				};
			}

			return { isEditing: false };
		},

		/**
		 * Checks if selection contains or intersects with a file tag
		 * @param {Object} state - Editor state
		 * @param {Object} view - Editor view
		 * @param {number} from - Selection start
		 * @param {number} to - Selection end
		 * @returns {Object} Context object
		 */
		checkSelectionForFileTag(state, view, from, to) {
			const selectedText = state.doc.textBetween(from, to).trim();

			// Check if selection is a complete file tag
			if (this.isCompleteFileTag(selectedText)) {
				return {
					isEditing: true,
					replaceRange: { from, to },
					tagText: selectedText
				};
			}

			// Check if selection intersects with a file tag
			const tagEl = this.findIntersectingFileTag(view, from, to);
			if (tagEl) {
				return {
					isEditing: true,
					tagEl,
					replaceRange: this.getFileTagRange(view, tagEl),
					tagText: tagEl.textContent
				};
			}

			return { isEditing: false };
		},

		/**
		 * Checks if text is a complete file tag
		 * @param {string} text - Text to check
		 * @returns {boolean}
		 */
		isCompleteFileTag(text) {
			return this.isFileTag(text) && text.endsWith(')');
		},

		/**
		 * Finds a file tag element that intersects with the selection
		 * @param {Object} view - Editor view
		 * @param {number} from - Selection start
		 * @param {number} to - Selection end
		 * @returns {Element|null} Tag element or null
		 */
		findIntersectingFileTag(view, from, to) {
			// Check start of selection
			const { node: startNode } = view.domAtPos(from);
			const startTagEl = findParentWithClass(startNode, 'kirbytag');
			if (startTagEl && this.isFileTag(startTagEl.textContent)) {
				return startTagEl;
			}

			// Check end of selection
			const { node: endNode } = view.domAtPos(to);
			const endTagEl = findParentWithClass(endNode, 'kirbytag');
			if (endTagEl && this.isFileTag(endTagEl.textContent)) {
				return endTagEl;
			}

			return null;
		},

		/**
		 * Gets the range (from/to positions) of a file tag element
		 * @param {Object} view - Editor view
		 * @param {Element} tagEl - Tag element
		 * @returns {Object} Range object with from and to positions
		 */
		getFileTagRange(view, tagEl) {
			const start = view.posAtDOM(tagEl, 0);
			const end = view.posAtDOM(tagEl, tagEl.childNodes.length);
			return { from: start, to: end };
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
				const initial = parseKirbyTag(context.tagText);

				// For UUID-based tags, look up the file ID first
				if (initial.uuid) {
					this.findFileByUuid(initial.uuid)
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
			} catch (error) {
				console.error('Error parsing existing file tag:', error);
				this.openFileDialog(restoreSelection, {}, [], false, null);
			}
		},

		openFileDialog(restoreSelection, initial, value, isEditing, replaceRange) {
			// Store editing context for upload handler
			this.editingContext = isEditing ? { replaceRange, restoreSelection } : null;

			this.$panel.dialog.open({
				component: 'k-files-dialog',
				props: {
					multiple: false,
					endpoint: `${this.endpoints.field}/files`,
					value: value
				},
				on: {
					cancel: restoreSelection,
					submit: (files) => {
						if (!files?.length) {
							this.$panel.notification.error(
								window.panel.$t('error.validation.required')
							);
							return;
						}

						this.$panel.dialog.close();

						restoreSelection(() => {
							const file = files[0];
							const content = file.dragText;

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

		async findFileByUuid(uuid) {
			try {
				const response = await this.$panel.api.get(`${this.endpoints.field}/files`);
				const files = response.data || [];
				const file = files.find(f => f.uuid === uuid);
				return file ? file.id : null;
			} catch (error) {
				return null;
			}
		},

		isFileTag(text) {
			return /^\((image|file|video):/i.test(text);
		},

		isFileActive(editor) {
			if (!editor.isFocused) return false;

			const { from, to, empty } = editor.state.selection;

			if (empty) {
				const { node } = editor.view.domAtPos(from);
				const tagEl = findParentWithClass(node, 'kirbytag');
				return tagEl ? this.isFileTag(tagEl.textContent) : false;
			} else {
				const selectedText = editor.state.doc.textBetween(from, to).trim();
				if (this.isFileTag(selectedText) && selectedText.endsWith(')')) {
					return true;
				}

				const { node: startNode } = editor.view.domAtPos(from);
				const startTagEl = findParentWithClass(startNode, 'kirbytag');
				if (startTagEl && this.isFileTag(startTagEl.textContent)) {
					return true;
				}

				const { node: endNode } = editor.view.domAtPos(to);
				const endTagEl = findParentWithClass(endNode, 'kirbytag');
				return endTagEl ? this.isFileTag(endTagEl.textContent) : false;
			}
		},

		/**
		 * Handles file upload functionality
		 */
		handleUpload() {
			if (!this.validateUploadPreconditions()) {
				return;
			}

			const uploadContext = this.getUploadContext();
			const uploadOptions = this.buildUploadOptions(uploadContext);
			this.initiateUpload(uploadOptions, uploadContext.restoreSelection);
		},

		/**
		 * Validates that upload functionality can be used
		 * @returns {boolean} Whether upload is possible
		 */
		validateUploadPreconditions() {
			if (!this.uploads) {
				this.$panel.notification.error(this.$t('tiptap.upload.error.disabled'));
				return false;
			}

			if (!this.endpoints?.field) {
				this.$panel.notification.error(this.$t('tiptap.upload.error.endpoint'));
				return false;
			}

			return true;
		},

		/**
		 * Gets the context for file upload (editing state, selection restore)
		 * @returns {Object} Upload context
		 */
		getUploadContext() {
			const { state, view } = this.editor;
			const { from, empty } = state.selection;
			const restoreSelection = this.restoreSelectionCallback();

			let isEditing = false;
			let replaceRange = null;

			// Only check for editing if cursor is positioned (no selection)
			if (empty) {
				const { node } = view.domAtPos(from);
				const tagEl = findParentWithClass(node, 'kirbytag');
				isEditing = Boolean(tagEl) && this.isFileTag(tagEl.textContent);

				if (isEditing) {
					replaceRange = this.getFileTagRange(view, tagEl);
				}
			}

			// Store editing context for later use
			this.editingContext = isEditing ? { replaceRange, restoreSelection } : null;

			return { isEditing, replaceRange, restoreSelection };
		},

		/**
		 * Builds upload options configuration
		 * @param {Object} context - Upload context
		 * @returns {Object} Upload options
		 */
		buildUploadOptions(context) {
			const { restoreSelection } = context;

			const uploadOptions = {
				url: this.getUploadUrl(),
				accept: this.uploads.accept || '*/*',
				multiple: false,
				on: {
					cancel: () => restoreSelection(),
					done: (files) => {
						restoreSelection(() => {
							this.handleUploadComplete(files);
						});
					},
					error: (error) => {
						restoreSelection();
						this.$panel.notification.error(`${this.$t('tiptap.upload.error.failed')}: ${error.message || 'Unknown error'}`);
					}
				}
			};

			// Add upload attributes if specified
			this.addUploadAttributes(uploadOptions);

			return uploadOptions;
		},

		/**
		 * Gets the correct upload URL
		 * @returns {string} Upload URL
		 */
		getUploadUrl() {
			return this.endpoints.field.includes('/api/')
				? `${this.endpoints.field}/upload`
				: `/api${this.endpoints.field}/upload`;
		},

		/**
		 * Adds upload attributes (template, parent) to upload options
		 * @param {Object} uploadOptions - Upload options to modify
		 */
		addUploadAttributes(uploadOptions) {
			if (this.uploads.template) {
				uploadOptions.attributes = { template: this.uploads.template };
			}

			if (this.uploads.parent) {
				uploadOptions.attributes = {
					...uploadOptions.attributes,
					parent: this.uploads.parent
				};
			}
		},

		/**
		 * Initiates the upload process
		 * @param {Object} uploadOptions - Upload configuration
		 * @param {Function} restoreSelection - Selection restore callback
		 */
		initiateUpload(uploadOptions, restoreSelection) {
			try {
				this.$panel.upload.pick(uploadOptions);
			} catch (error) {
				this.$panel.notification.error(`${this.$t('tiptap.upload.error.dialog')}: ${error.message}`);
				restoreSelection();
			}
		},

		handleUploadComplete(files) {
			if (!files?.length) {
				this.$panel.notification.error(this.$t('tiptap.upload.error.noFiles'));
				return;
			}

			try {
				const file = files[0][0];
				if (!file) {
					this.$panel.notification.error(this.$t('tiptap.upload.error.noData'));
					return;
				}

				const content = file.dragText;
				if (!content || !this.editor?.commands) {
					this.$panel.notification.error(this.$t('tiptap.upload.error.insert'));
					return;
				}

				if (this.editingContext?.restoreSelection && this.editingContext?.replaceRange) {
					// Store context locally before clearing
					const { restoreSelection, replaceRange } = this.editingContext;
					this.editingContext = null;

					restoreSelection(() => {
						this.editor.chain().focus()
							.deleteRange(replaceRange)
							.insertContent(content)
							.run();
					});
				} else {
					this.editor.commands.insertContent(content);
					this.editingContext = null;
				}

				this.$panel.notification.success(this.$t('tiptap.upload.success'));
			} catch (error) {
				this.$panel.notification.error(`${this.$t('tiptap.upload.error.insert')}: ${error.message}`);
			}
		}

	}
}
</script>