<template>
	<ToolbarButton icon="code" :title="$t('toolbar.button.code')" :editor="editor" command="toggleCode"
		active-check="code" />
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
