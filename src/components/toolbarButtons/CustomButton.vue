<template>
	<ToolbarButton :icon="icon" :title="title" :editor="editor" :command="toggleClass" :active-check="isActive" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'

// Shared cache for parsed classes across all custom button instances
const classCache = new WeakMap()

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
	data() {
		return {
			// Cache for active state
			cachedActiveState: false,
			cachedNodeType: null,
			cachedNodeAttrs: null
		}
	},
	computed: {
		icon() {
			return this.buttonConfig.icon || 'style'
		},
		title() {
			return this.buttonConfig.title || 'Toggle Style'
		},
		nodes() {
			return this.buttonConfig.nodes || ['paragraph']
		},
		attributes() {
			return this.buttonConfig.attributes || {}
		}
	},
	methods: {
		toggleClass(editor) {
			editor.chain().focus().toggleNodeAttributes(this.nodes, this.attributes).run()
		},
		isActive(editor) {
			const { $from } = editor.state.selection
			const node = $from.parent

			// Check if we can use cached value
			if (this.cachedNodeType === node.type.name &&
				this.cachedNodeAttrs === node.attrs) {
				return this.cachedActiveState
			}

			// Update cache
			this.cachedNodeType = node.type.name
			this.cachedNodeAttrs = node.attrs

			if (this.nodes.includes(node.type.name)) {
				this.cachedActiveState = this.checkAttributes(node)
			} else {
				this.cachedActiveState = false
			}

			return this.cachedActiveState
		},
		checkAttributes(node) {
			return Object.entries(this.attributes).every(([key, value]) => {
				if (key === 'class' && node.attrs.class) {
					const classes = this.getParsedClasses(node)
					return classes.has(value)
				}
				return node.attrs[key] === value
			})
		},
		getParsedClasses(node) {
			if (!node.attrs.class || typeof node.attrs.class !== 'string') return new Set()

			// Check if we have cached classes for this node
			if (classCache.has(node)) {
				const cached = classCache.get(node)
				if (cached.source === node.attrs.class) {
					return cached.classes
				}
			}

			// Parse and cache the classes
			const classes = new Set(node.attrs.class.trim().split(/\s+/).filter(Boolean))
			classCache.set(node, {
				source: node.attrs.class,
				classes: classes
			})

			return classes
		}
	}
}
</script>

<style></style>