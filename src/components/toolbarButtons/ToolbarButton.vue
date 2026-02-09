<template>
	<div v-if="dropdown && dropdown.length" class="tiptap-button-wrapper">
		<!-- Dropdown button when dropdown items exist -->
		<k-button :icon="icon" :title="formattedTitle" :ariaLabel="formattedTitle"
			:class="['k-toolbar-button', 'tiptap-button']" :current="active" :disabled="disabled" @mousedown.prevent @click="toggleDropdown" />
		<k-dropdown-content ref="dropdown" :options="dropdownOptions" align-x="start" @action="onDropdownAction" />
	</div>

	<!-- Regular button when no dropdown -->
	<k-button v-else :icon="icon" :title="formattedTitle" :ariaLabel="formattedTitle"
		:class="['k-toolbar-button', 'tiptap-button']" :current="active" :disabled="disabled" @mousedown.prevent @click="runCommand" />
</template>

<script>
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
			updateTimer: null
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
			handler(editor) {
				if (!editor) return

				// Set up throttled update handler
				const updateState = () => {
					if (!this.editor || !this.editor.isActive) return

					this.active = typeof this.activeCheck === 'function'
						? this.activeCheck(this.editor)
						: this.editor.isActive(this.activeCheck)

					const disabledByCheck = typeof this.disabledCheck === 'function'
						? this.disabledCheck(this.editor)
						: false
					const disabledByCommand = typeof this.command === 'string'
						? !this.editor.can()[this.command]?.()
						: false
					this.disabled = (disabledByCheck || disabledByCommand) && !this.active
				}

				// Initial state
				updateState()

				// Listen to editor updates with throttling
				editor.on('selectionUpdate', () => {
					// Clear existing timer
					if (this.updateTimer) {
						clearTimeout(this.updateTimer)
					}

					// Throttle updates to max once per 50ms
					this.updateTimer = setTimeout(updateState, 50)
				})

				editor.on('transaction', ({ transaction }) => {
					// Only update on selection changes or doc changes
					if (transaction.docChanged || transaction.selectionSet) {
						if (this.updateTimer) {
							clearTimeout(this.updateTimer)
						}
						this.updateTimer = setTimeout(updateState, 50)
					}
				})

				this.registerShortcut()
			}
		}
	},
	beforeDestroy() {
		if (this.updateTimer) {
			clearTimeout(this.updateTimer)
		}
		this.unregisterShortcut()
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

			this.keyboardHandler = (event) => {
				const parts = this.shortcut.split('-')
				const key = parts.pop().toLowerCase()

				const needsMod = parts.includes('Mod')
				const needsShift = parts.includes('Shift')
				const needsAlt = parts.includes('Alt')

				const modMatch = needsMod === (event.metaKey || event.ctrlKey)
				const shiftMatch = needsShift === event.shiftKey
				const altMatch = needsAlt === event.altKey
				const keyMatch = event.key.toLowerCase() === key

				if (modMatch && shiftMatch && altMatch && keyMatch) {
					event.preventDefault()
					if (!this.disabled) this.runCommand()
				}
			};

			if (this.editor.view?.dom) {
				this.editor.view.dom.addEventListener('keydown', this.keyboardHandler);
			}
		},

		unregisterShortcut() {
			if (this.keyboardHandler && this.editor?.view?.dom) {
				this.editor.view.dom.removeEventListener('keydown', this.keyboardHandler);
				this.keyboardHandler = null;
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

/* Makes sure nested buttons (like the first heading) are also rounded */
.tiptap-button:first-child {
	border-start-start-radius: var(--rounded);
	border-end-start-radius: var(--rounded)
}
</style>