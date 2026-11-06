<template>
	<ToolbarButton icon="image" :title="$t('toolbar.button.file')" :editor="editor" :command="handleSelect"
		:active-check="isFileActive" :disabled-check="kirbyTagDisabledCheck" :dropdown="dropdownItems" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { getTagEditingContext, isFileTag, isTagActive } from '../../utils/kirbyTags';
import { kirbyTagDisabledCheck } from '../../extensions/insertionGuards';

export default {
	inheritAttrs: false,
	components: {
		ToolbarButton
	},

	props: {
		editor: {
			type: Object,
			required: true
		},
		uploads: {
			type: [Object, Boolean],
			default: false
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
		}
	},

	methods: {
		updateEditingFlag() {
			this.isEditingFileTag = getTagEditingContext(this.editor, isFileTag).isEditing;
		},

		handleSelect() {
			this.editor.commands.openFileDialog();
		},

		handleUpload() {
			this.editor.commands.uploadFile();
		},

		kirbyTagDisabledCheck,

		isFileActive(editor) {
			return isTagActive(editor, isFileTag);
		},
	}
}
</script>