<template>
	<ToolbarButton :icon="icon" :title="label" :editor="editor" :command="executeCommand" :active-check="checkActive" />
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
		},
		buttonName: {
			type: String,
			required: true
		},
		buttonConfig: {
			type: Object,
			required: true
		}
	},
	computed: {
		icon() {
			return this.buttonConfig.icon || 'puzzle'
		},
		label() {
			return this.buttonConfig.label || this.buttonName
		}
	},
	methods: {
		executeCommand(editor) {
			try {
				this.buttonConfig.command({ editor })
			} catch (error) {
				console.warn(`[kirby-tiptap] Registry button "${this.buttonName}" command failed:`, error)
			}
		},
		checkActive(editor) {
			if (typeof this.buttonConfig.activeCheck !== 'function') {
				return false
			}
			try {
				return !!this.buttonConfig.activeCheck({ editor })
			} catch (error) {
				console.warn(`[kirby-tiptap] Registry button "${this.buttonName}" activeCheck failed:`, error)
				return false
			}
		}
	}
}
</script>

<style></style>
