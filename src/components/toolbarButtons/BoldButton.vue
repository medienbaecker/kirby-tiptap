<template>
	<ToolbarButton icon="bold" :title="$t('toolbar.button.bold')" :editor="editor" command="toggleBold"
		active-check="bold" :disabled-check="kirbyTagDisabledCheck" />
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
