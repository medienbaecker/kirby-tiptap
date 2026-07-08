<template>
	<nav class="k-toolbar tiptap-toolbar" role="toolbar" :aria-label="$t('toolbar')" v-if="editor"
		@keydown="handleKeydown" @focusin="handleFocusIn" @mousedown.prevent>
		<template v-for="(button, index) in normalizedButtons"
			:key="isSeparator(button) ? 'sep-' + index : getKey(button)">
			<hr v-if="isSeparator(button)" />
			<ToolbarButton v-else-if="getSimple(button)" :editor="editor"
				:icon="getIcon(button)" :title="$t(getSimple(button).title)" :command="getSimple(button).command"
				:active-check="getSimple(button).activeCheck" :disabled-check="getSimple(button).disabledCheck" />
			<component v-else :is="getComponentType(button)" :editor="editor"
				:levels="getLevels(button)" :links="links" :files="files" :endpoints="endpoints" :uploads="uploads"
				:kirbytags="kirbytags" :buttonName="getButtonName(button)" :buttonConfig="getButtonConfig(button)" />
		</template>
	</nav>
</template>

<script>
import { defineAsyncComponent, h, resolveComponent } from 'vue'
import { props } from './props.js'
import { buttonRegistry } from '../utils/buttonRegistry.js'
import ToolbarButton from './toolbarButtons/ToolbarButton.vue'

// Component cache to avoid recreating async components
const componentCache = new Map()

export default {
	components: { ToolbarButton },

	props: {
		editor: Object,
		...props
	},

	created() {
		// Non-reactive: mutated during render, so keep it out of data().
		this.warnedButtons = new Set()
	},

	mounted() {
		this.$nextTick(() => this.initRovingTabindex())
	},

	updated() {
		// Buttons load async, so the first roving-tabindex pass can run before any
		// exist. Re-run once buttons are present but none is the tab stop yet.
		if (this.getButtons().length && !this.$el.querySelector('button[tabindex="0"]')) {
			this.initRovingTabindex()
		}
	},

	computed: {
		// Dynamically load button components from registry with caching
		buttonComponents() {
			const components = {}

			// Get all buttons from registry
			for (const [name, config] of buttonRegistry.getAllButtons()) {
				// Simple buttons render a plain ToolbarButton, no component to load
				if (!config.component) {
					continue
				}
				// Use cached component or create new one
				if (!componentCache.has(name)) {
					componentCache.set(name, defineAsyncComponent({
						loader: config.component,
						errorComponent: {
							name: `${name}ButtonError`,
							render() {
								return h(resolveComponent('k-button'), {
									icon: 'alert',
									title: `Error loading ${name} button`,
									disabled: true,
									class: 'tiptap-button-error'
								})
							}
						}
					}))
				}
				components[name] = componentCache.get(name)
			}

			return components
		},

		// Normalize buttons to include metadata
		normalizedButtons() {
			return this.buttons.map(button => {
				// Handle separator
				if (button === '|') {
					return { type: '|' }
				}

				if (typeof button === 'object') {
					if (button.headings) {
						return {
							type: 'headings',
							levels: button.headings
						}
					}

					// New configurable format (paragraphClass, etc.)
					return {
						type: button.type || 'unknown',
						className: button.className,
						icon: button.icon,
						title: button.title,
						...button // Spread any additional properties
					}
				}

				// Handle string buttons
				return { type: button }
			})
		},

	},

	methods: {
		isSeparator(button) {
			return button.type === '|'
		},

		getSimple(button) {
			// Registry buttons can override core buttons, so only treat the
			// button as simple when the resolved entry itself is simple
			return buttonRegistry.getButton(button.type)?.simple || null
		},

		getIcon(button) {
			return buttonRegistry.getButton(button.type)?.meta.icon
		},

		getComponentType(button) {
			const component = this.buttonComponents[button.type]
			if (!component && button.type !== '|' && !this.warnedButtons.has(button.type)) {
				this.warnedButtons.add(button.type)
				console.warn(`[kirby-tiptap] Unknown toolbar button "${button.type}" — not found in registry. Check the blueprint or that its extension is loaded.`)
			}
			return component
		},

		getKey(button) {
			if (button.levels) {
				return button.type + `-${button.levels.join('-')}`
			}
			if (button.className) {
				return button.type + `-${button.className}`
			}
			return button.type
		},

		getLevels(button) {
			return button.levels
		},

		getButtonName(button) {
			const entry = buttonRegistry.getButton(button.type)
			if (entry && entry.meta.group === 'registry') {
				return entry.meta.buttonName
			}
			return null
		},

		getButtonConfig(button) {
			const entry = buttonRegistry.getButton(button.type)
			if (entry && entry.meta.group === 'registry') {
				return entry.meta.buttonConfig
			}
			return null
		},

		// Roving tabindex methods
		getButtons() {
			if (!this.$el) return []
			// Toolbar-level buttons only — exclude buttons inside open dropdowns.
			return Array.from(this.$el.querySelectorAll('button'))
				.filter(btn => !btn.closest('.k-dropdown'))
		},

		initRovingTabindex() {
			const buttons = this.getButtons()
			buttons.forEach((btn, i) => {
				btn.setAttribute('tabindex', i === 0 ? '0' : '-1')
			})
		},

		handleKeydown(event) {
			const { key } = event
			if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return

			event.preventDefault()
			const buttons = this.getButtons()
			if (!buttons.length) return

			const currentIndex = buttons.indexOf(document.activeElement)
			let nextIndex

			switch (key) {
				case 'ArrowRight':
					nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0
					break
				case 'ArrowLeft':
					nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1
					break
				case 'Home':
					nextIndex = 0
					break
				case 'End':
					nextIndex = buttons.length - 1
					break
			}

			this.focusButton(nextIndex)
		},

		handleFocusIn(event) {
			const buttons = this.getButtons()
			const focusedButton = event.target.closest('button')
			if (!focusedButton || !buttons.includes(focusedButton)) return

			// Update tabindex: focused gets 0, others get -1
			buttons.forEach(btn => {
				btn.setAttribute('tabindex', btn === focusedButton ? '0' : '-1')
			})
		},

		focusButton(index) {
			const buttons = this.getButtons()
			if (buttons[index]) {
				buttons[index].focus()
			}
		}
	}
}
</script>

<style>
.tiptap-toolbar {

	/* Default styles */
	border-bottom: 1px solid var(--toolbar-border);
	border-end-start-radius: 0;
	border-end-end-radius: 0;

	/* Improving on k-toolbar: */

	/* Grow toolbar height with scrollbar */
	height: auto;
	scrollbar-width: thin;

	/* More subtle hover for better combination with blue (active) */
	--toolbar-hover: light-dark(var(--color-gray-100), var(--color-gray-800));
}

/* Turning buttons grey when not focused */
:where(.k-tiptap-input):not(:focus-within) {
	--toolbar-text: var(--color-gray-400);
}

/* Override active button blue with gray when editor not focused */
.k-tiptap-input:not(:focus-within) .tiptap-toolbar .k-button[aria-current=true] {
	--button-color-text: var(--color-gray-400);
}

/* Turning toolbar sticky when focused */
:where(.k-tiptap-input):focus-within .tiptap-toolbar {
	position: sticky;
	top: var(--header-sticky-offset);
	inset-inline: 0;
	box-shadow: rgba(0, 0, 0, 0.05) 0 2px 5px;
}
</style>
