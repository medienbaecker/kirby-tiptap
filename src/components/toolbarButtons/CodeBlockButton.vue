<template>
	<ToolbarButton icon="code-block" :title="$t('tiptap.toolbar.button.codeBlock')" :editor="editor"
		command="toggleCodeBlock" active-check="codeBlock" :disabled-check="isDisabled" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'
import { findKirbyTagRanges } from '../../utils/kirbyTags'

export default {
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
		isDisabled(editor) {
			const text = editor.state.selection.$from.parent.textContent
			return findKirbyTagRanges(text).length > 0
		}
	}
}
</script>

<style></style>
