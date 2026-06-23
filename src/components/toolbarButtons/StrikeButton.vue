<template>
	<ToolbarButton icon="strikethrough" :title="$t('toolbar.button.strike')" :editor="editor" command="toggleStrike"
		active-check="strike" :disabled-check="formattingDisabledCheck" />
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
