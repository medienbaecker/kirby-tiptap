<template>
	<ToolbarButton icon="quote" :title="$t('tiptap.toolbar.button.blockquote')" :editor="editor"
		command="toggleBlockquote" active-check="blockquote" />
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