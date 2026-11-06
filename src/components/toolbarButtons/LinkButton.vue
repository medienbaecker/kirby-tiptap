<template>
	<ToolbarButton icon="url" :title="$t('toolbar.button.link')" :editor="editor" :command="handleLink"
		:active-check="isLinkActive" :disabled-check="kirbyTagDisabledCheck" shortcut="Mod-k" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { isLinkTag, isTagActive } from '../../utils/kirbyTags';
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
		}
	},

	methods: {
		handleLink(editor) {
			editor.commands.openLinkDialog();
		},

		kirbyTagDisabledCheck,

		isLinkActive(editor) {
			return isTagActive(editor, isLinkTag);
		},
	}
};
</script>
