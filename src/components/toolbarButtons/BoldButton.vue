<template>
	<ToolbarButton icon="bold" :title="$t('toolbar.button.bold')" :editor="editor" command="toggleBold"
		active-check="bold" :disabled-check="formattingDisabledCheck" />
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
