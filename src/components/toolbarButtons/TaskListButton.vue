<template>
	<ToolbarButton icon="checklist" :title="$t('toolbar.button.taskList')" :editor="editor" command="toggleTaskList"
		active-check="taskList" />
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