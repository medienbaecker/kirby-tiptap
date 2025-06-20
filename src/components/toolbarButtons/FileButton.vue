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
			const { state, view } = this.editor;
			const { from, to, empty } = state.selection;

			// Check if we're editing an existing file tag
			let isEditing = false;
			let tagEl = null;
			let replaceRange = null;
			let initial = {};

			// Case 1: Cursor inside a tag
			if (empty) {
				const { node } = view.domAtPos(from);
				tagEl = findParentWithClass(node, 'kirbytag');
				isEditing = Boolean(tagEl) && this.isFileTag(tagEl.textContent);
			}
			// Case 2: Selection
			else {
				// First check if the selection is a complete tag
				const selectedText = state.doc.textBetween(from, to).trim();
				if (this.isFileTag(selectedText) && selectedText.endsWith(')')) {
					isEditing = true;
					replaceRange = { from, to };
					try {
						initial = parseKirbyTag(selectedText);
					} catch (e) {
						console.error("Error parsing tag:", e);
						isEditing = false;
					}
				}
				// If not a complete tag, check if selection intersects with a tag
				else {
					// Check if selection starts inside a tag
					const { node: startNode } = view.domAtPos(from);
					const startTagEl = findParentWithClass(startNode, 'kirbytag');
					if (startTagEl && this.isFileTag(startTagEl.textContent)) {
						isEditing = true;
						tagEl = startTagEl;
					}

					// If not starting in a tag, check if it ends in one
					if (!isEditing) {
						const { node: endNode } = view.domAtPos(to);
						const endTagEl = findParentWithClass(endNode, 'kirbytag');
						if (endTagEl && this.isFileTag(endTagEl.textContent)) {
							isEditing = true;
							tagEl = endTagEl;
						}
					}
				}
			}

			// If editing via cursor position or partial tag selection, get the tag range
			if (isEditing && tagEl && !replaceRange) {
				const start = view.posAtDOM(tagEl, 0);
				const end = view.posAtDOM(tagEl, tagEl.childNodes.length);
				replaceRange = { from: start, to: end };
				initial = parseKirbyTag(tagEl.textContent);
			}

			const restoreSelection = this.restoreSelectionCallback();

			// For UUID-based tags, we need to look up the file ID first
			if (initial.uuid) {
				this.findFileByUuid(initial.uuid).then(fileId => {
					const value = fileId ? [fileId] : [];
					this.openFileDialog(restoreSelection, initial, value, isEditing, replaceRange);
				}).catch(() => {
					this.openFileDialog(restoreSelection, initial, [], isEditing, replaceRange);
				});
				return;
			}

			// For new insertions, open dialog directly
			this.openFileDialog(restoreSelection, initial, [], isEditing, replaceRange);
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

		handleUpload() {
			if (!this.uploads) {
				this.$panel.notification.error('Uploads are not enabled for this field');
				return;
			}

			if (!this.endpoints?.field) {
				this.$panel.notification.error('Upload endpoint not configured');
				return;
			}

			// Detect if we're editing an existing file tag
			const { state, view } = this.editor;
			const { from, empty } = state.selection;

			let isEditing = false;
			let replaceRange = null;

			if (empty) {
				const { node } = view.domAtPos(from);
				const tagEl = findParentWithClass(node, 'kirbytag');
				isEditing = Boolean(tagEl) && this.isFileTag(tagEl.textContent);

				if (isEditing) {
					const start = view.posAtDOM(tagEl, 0);
					const end = view.posAtDOM(tagEl, tagEl.childNodes.length);
					replaceRange = { from: start, to: end };
				}
			}

			const restoreSelection = this.restoreSelectionCallback();
			this.editingContext = isEditing ? { replaceRange, restoreSelection } : null;

			const uploadOptions = {
				url: this.endpoints.field.includes('/api/') ? `${this.endpoints.field}/upload` : `/api${this.endpoints.field}/upload`,
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
						this.$panel.notification.error(`Upload failed: ${error.message || 'Unknown error'}`);
					}
				}
			};

			if (this.uploads.template) {
				uploadOptions.attributes = { template: this.uploads.template };
			}

			if (this.uploads.parent) {
				uploadOptions.attributes = {
					...uploadOptions.attributes,
					parent: this.uploads.parent
				};
			}

			try {
				this.$panel.upload.pick(uploadOptions);
			} catch (error) {
				this.$panel.notification.error(`Failed to open upload dialog: ${error.message}`);
				restoreSelection();
			}
		},

		handleUploadComplete(files) {
			if (!files?.length) {
				this.$panel.notification.error('No files were uploaded');
				return;
			}

			try {
				const file = files[0][0];
				if (!file) {
					this.$panel.notification.error('No file data received from upload');
					return;
				}

				const content = file.dragText;
				if (!content || !this.editor?.commands) {
					this.$panel.notification.error('Failed to insert uploaded file');
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

				this.$panel.notification.success('File uploaded and inserted successfully');
			} catch (error) {
				this.$panel.notification.error(`Failed to insert uploaded file: ${error.message}`);
			}
		}

	}
}
</script>