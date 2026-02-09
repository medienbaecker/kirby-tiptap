<template>
	<ToolbarButton icon="code" :title="$t('toolbar.button.code')" :editor="editor" command="toggleCode"
		active-check="code" :disabled-check="kirbyTagDisabledCheck" />
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
