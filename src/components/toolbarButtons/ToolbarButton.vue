<template>
	<div v-if="dropdown && dropdown.length" class="tiptap-button-wrapper">
		<!-- Dropdown button when dropdown items exist -->
		<k-button :icon="icon" :title="title" :ariaLabel="title" :class="['k-toolbar-button', 'tiptap-button']"
			:current="isActive" @mousedown.prevent @click="toggleDropdown" />
		<k-dropdown-content ref="dropdown" :options="dropdownOptions" align-x="start" @action="onDropdownAction" />
	</div>

	<!-- Regular button when no dropdown -->
	<k-button v-else :icon="icon" :title="title" :ariaLabel="title" :class="['k-toolbar-button', 'tiptap-button']"
		:current="isActive" @mousedown.prevent @click="runCommand" />
</template>

<script>
export default {
	props: {
		icon: String,
		title: String,
		editor: Object,
		command: [String, Function],
		activeCheck: [String, Function],
		dropdown: Array
	},
	data() {
		return {
			active: false,
			updateTimer: null
		}
	},
	computed: {
		isActive() {
			return this.active
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
				const updateActiveState = () => {
					if (!this.editor) return

					this.active = typeof this.activeCheck === 'function'
						? this.activeCheck(this.editor)
						: this.editor.isActive(this.activeCheck)
				}

				// Initial state
				updateActiveState()

				// Listen to editor updates with throttling
				editor.on('selectionUpdate', () => {
					// Clear existing timer
					if (this.updateTimer) {
						clearTimeout(this.updateTimer)
					}

					// Throttle updates to max once per 50ms
					this.updateTimer = setTimeout(updateActiveState, 50)
				})

				editor.on('transaction', ({ transaction }) => {
					// Only update on selection changes or doc changes
					if (transaction.docChanged || transaction.selectionSet) {
						if (this.updateTimer) {
							clearTimeout(this.updateTimer)
						}
						this.updateTimer = setTimeout(updateActiveState, 50)
					}
				})
			}
		}
	},
	beforeDestroy() {
		if (this.updateTimer) {
			clearTimeout(this.updateTimer)
		}
	},
	methods: {
		runCommand() {
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