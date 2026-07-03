<template>
	<div v-if="dropdown && dropdown.length" class="tiptap-button-wrapper">
		<!-- Dropdown button when dropdown items exist -->
		<k-button :icon="icon" :title="formattedTitle" :ariaLabel="formattedTitle"
			:class="['k-toolbar-button', 'tiptap-button']" :current="active" :disabled="disabled" @click="toggleDropdown" />
		<k-dropdown-content ref="dropdown" :options="dropdownOptions" align-x="start" @action="onDropdownAction" />
	</div>

	<!-- Regular button when no dropdown -->
	<k-button v-else :icon="icon" :title="formattedTitle" :ariaLabel="formattedTitle"
		:class="['k-toolbar-button', 'tiptap-button']" :current="active" :disabled="disabled" @click="runCommand" />
</template>

<script>
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { keydownHandler } from '@tiptap/pm/keymap'
import { getShortcut } from '../../utils/shortcuts.js'

export default {
	props: {
		icon: String,
		title: String,
		editor: Object,
		command: [String, Function],
		activeCheck: [String, Function],
		dropdown: Array,
		shortcut: String,
		disabledCheck: Function
	},
	data() {
		return {
			active: false,
			disabled: false,
			updateTimer: null,
			shortcutPluginKey: null,
			onSelectionUpdate: null,
			onTransaction: null
		}
	},
	computed: {
		isMac() {
			return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
		},
		resolvedShortcut() {
			// Explicit shortcut prop takes priority, otherwise auto-detect from command
			return this.shortcut || getShortcut(this.command)
		},
		formattedTitle() {
			if (!this.resolvedShortcut) return this.title

			// Parse shortcut parts
			const parts = this.resolvedShortcut.split('-')
			const key = parts.pop().toUpperCase()

			let modifiers = ''
			if (this.isMac) {
				if (parts.includes('Mod')) modifiers += '⌘'
				if (parts.includes('Shift')) modifiers += '⇧'
				if (parts.includes('Alt')) modifiers += '⌥'
			} else {
				const mods = []
				if (parts.includes('Mod')) mods.push('Ctrl')
				if (parts.includes('Shift')) mods.push('Shift')
				if (parts.includes('Alt')) mods.push('Alt')
				modifiers = mods.length ? mods.join('+') + '+' : ''
			}

			return `${this.title} (${modifiers}${key})`
		},
		dropdownOptions() {
			if (!this.dropdown) return []

			const options = this.dropdown.map((item, index) => ({
				text: item.label,
				icon: item.icon,
				click: `item-${index}` // Use string action that we'll handle in @action
			}));

			return options;
		}
	},
	watch: {
		editor: {
			immediate: true,
			handler(editor, oldEditor) {
				// Detach the old editor so its listeners don't leak on prop change.
				if (oldEditor) this.detachEditor(oldEditor)
				if (!editor) return

				const updateState = () => {
					if (!this.editor || !this.editor.isActive) return

					this.active = typeof this.activeCheck === 'function'
						? this.activeCheck(this.editor)
						: this.activeCheck
							? this.editor.isActive(this.activeCheck)
							: false

					this.disabled = typeof this.disabledCheck === 'function'
						? this.disabledCheck(this.editor) && !this.active
						: false
				}

				// Initial state
				updateState()

				// Named (not inline) so detachEditor can remove them. Throttled to 50ms.
				this.onSelectionUpdate = () => {
					clearTimeout(this.updateTimer)
					this.updateTimer = setTimeout(updateState, 50)
				}

				this.onTransaction = ({ transaction }) => {
					if (transaction.docChanged || transaction.selectionSet) {
						clearTimeout(this.updateTimer)
						this.updateTimer = setTimeout(updateState, 50)
					}
				}

				editor.on('selectionUpdate', this.onSelectionUpdate)
				editor.on('transaction', this.onTransaction)

				this.registerShortcut()
			}
		}
	},
	beforeDestroy() {
		clearTimeout(this.updateTimer)
		this.detachEditor(this.editor)
	},
	methods: {
		runCommand() {
			if (this.disabled) return

			// If dropdown exists and has items, run the first dropdown item's click handler
			if (this.dropdown && this.dropdown.length) {
				this.dropdown[0].click?.()
				return
			}

			// Otherwise, run the original command
			if (typeof this.command === 'function') {
				this.command(this.editor);
			} else {
				this.editor.chain().focus()[this.command]().run();
			}
		},

		toggleDropdown() {
			if (this.$refs.dropdown) {
				this.$refs.dropdown.toggle()
			}
		},

		onDropdownAction(action) {
			// Parse the action string to get the index
			if (typeof action === 'string' && action.startsWith('item-')) {
				const index = parseInt(action.replace('item-', ''));
				const item = this.dropdown[index];
				if (item && typeof item.click === 'function') {
					item.click();
				}
			}
		},

		registerShortcut() {
			if (!this.shortcut || !this.editor) return;

			// A ProseMirror keymap plugin handles Mod normalization and runs
			// after the extensions' own keymaps, so built-in shortcuts win.
			this.shortcutPluginKey = new PluginKey(`toolbarShortcut:${this.shortcut}`)
			this.editor.registerPlugin(new Plugin({
				key: this.shortcutPluginKey,
				props: {
					handleKeyDown: keydownHandler({
						[this.shortcut]: () => {
							if (!this.disabled) this.runCommand()
							return true
						}
					})
				}
			}))
		},

		detachEditor(editor) {
			if (!editor) return

			if (this.onSelectionUpdate) editor.off('selectionUpdate', this.onSelectionUpdate)
			if (this.onTransaction) editor.off('transaction', this.onTransaction)

			if (this.shortcutPluginKey && !editor.isDestroyed) {
				editor.unregisterPlugin(this.shortcutPluginKey)
				this.shortcutPluginKey = null
			}
		}
	}
}
</script>

<style>
.tiptap-button {
	display: flex;
}

.tiptap-button-wrapper {
	position: relative;
	display: inline-block;
}

/* Round the toolbar's first/last button, also when nested in a wrapper
   (headings group, dropdown button). Anchored to the toolbar so a
   mid-toolbar dropdown button doesn't match via its own wrapper. */
.tiptap-toolbar > :first-child .tiptap-button:first-child,
.tiptap-toolbar > .tiptap-button:first-child {
	border-start-start-radius: var(--rounded);
	border-end-start-radius: var(--rounded);
}

.tiptap-toolbar > :last-child .tiptap-button:last-child,
.tiptap-toolbar > .tiptap-button:last-child {
	border-start-end-radius: var(--rounded);
	border-end-end-radius: var(--rounded);
}
</style>