<template>
	<ToolbarButton icon="bold" :title="$t('toolbar.button.bold')" :editor="editor" command="toggleBold"
		active-check="bold" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'

export default {
	components: {
		ToolbarButton
	},
	props: {
		editor: {
			type: Object,
			required: true
		}
	}
}
</script>

<style></style>
