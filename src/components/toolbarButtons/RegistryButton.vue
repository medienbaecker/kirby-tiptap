<template>
	<ToolbarButton :icon="icon" :title="label" :editor="editor" :command="executeCommand" :active-check="checkActive" :disabled-check="checkDisabled" :shortcut="buttonConfig.shortcut" :dropdown="dropdownItems" />
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
		},
		dropdownItems() {
			if (typeof this.buttonConfig.dropdown !== 'function') {
				return null
			}
			try {
				return this.buttonConfig.dropdown({ editor: this.editor })
			} catch (error) {
				console.warn(`[kirby-tiptap] Registry button "${this.buttonName}" dropdown failed:`, error)
				return null
			}
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
		},
		checkDisabled(editor) {
			if (kirbyTagDisabledCheck(editor)) return true
			if (typeof this.buttonConfig.disabledCheck !== 'function') {
				return false
			}
			try {
				return !!this.buttonConfig.disabledCheck({ editor })
			} catch (error) {
				console.warn(`[kirby-tiptap] Registry button "${this.buttonName}" disabledCheck failed:`, error)
				return false
			}
		}
	}
}
</script>

<style></style>
