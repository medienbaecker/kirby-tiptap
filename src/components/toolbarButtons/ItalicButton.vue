<template>
	<ToolbarButton icon="italic" :title="$t('toolbar.button.italic')" :editor="editor" command="toggleItalic"
		active-check="italic" :disabled-check="formattingDisabledCheck" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'
import { formattingDisabledCheck } from '../../extensions/insertionGuards'

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
		formattingDisabledCheck
	}
}
</script>

<style></style>
