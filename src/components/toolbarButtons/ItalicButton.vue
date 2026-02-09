<template>
	<ToolbarButton icon="italic" :title="$t('toolbar.button.italic')" :editor="editor" command="toggleItalic"
		active-check="italic" :disabled-check="kirbyTagDisabledCheck" />
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
