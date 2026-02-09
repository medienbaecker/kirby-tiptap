<template>
	<ToolbarButton icon="strikethrough" :title="$t('toolbar.button.strike')" :editor="editor" command="toggleStrike"
		active-check="strike" :disabled-check="kirbyTagDisabledCheck" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'
import { kirbyTagDisabledCheck } from '../../extensions/insertionGuards'

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
		kirbyTagDisabledCheck
	}
}
</script>

<style></style>
