import type { Editor } from '@tiptap/vue-2'
import type { AnyExtension } from '@tiptap/core'
import type { Component } from 'vue'

// Field props interface
export interface TiptapFieldProps {
	name: string
	label?: string
	value?: string
	pretty?: boolean
	placeholder?: string
	disabled?: boolean
	required?: boolean
	spellcheck?: boolean
	help?: string
	minlength?: number
	maxlength?: number
	size?: string
	buttons?: string[]
	inline?: boolean
	kirbytags?: string[]
	links?: LinksConfig
	files?: FilesConfig
	endpoints?: EndpointsConfig
	uploads?: UploadsConfig | false
	uuid?: UuidConfig
}

// Links configuration
export interface LinksConfig {
	options?: string[]
}

// Files configuration
export interface FilesConfig {
	query?: string
	image?: Record<string, unknown>
}

// Endpoints configuration
export interface EndpointsConfig {
	field: string
	'process-kirbytag'?: string
}

// Uploads configuration
export interface UploadsConfig {
	template?: string
	parent?: string
}

// UUID configuration
export interface UuidConfig {
	pages?: boolean
	files?: boolean
}

// Button registry types
export type ButtonGroup = 'text' | 'blocks' | 'lists' | 'registry'

export interface ButtonMeta {
	icon: string
	group: ButtonGroup
	buttonName?: string
	buttonConfig?: RegistryButton
}

export interface ButtonRegistryEntry {
	component: () => Promise<{ default: Component }>
	meta: ButtonMeta
}

export interface ButtonRegistry {
	getButton(name: string): ButtonRegistryEntry | undefined
	getAllButtons(): Map<string, ButtonRegistryEntry>
	hasButton(name: string): boolean
}

// Button item types for field configuration
export type ButtonItem =
	| string           // Core buttons: 'bold', 'italic', '|', etc.
	| HeadingsButton   // { headings: [1, 2, 3] }

export interface HeadingsButton {
	headings: number[]
}

// Tiptap document structure
export interface TiptapDocument {
	type: 'doc'
	content: TiptapNode[]
}

export interface TiptapNode {
	type: string
	attrs?: Record<string, unknown>
	content?: TiptapNode[]
	text?: string
	marks?: TiptapMark[]
}

export interface TiptapMark {
	type: string
	attrs?: Record<string, unknown>
}

// Resolved KirbyTag navigation target
export interface ResolvedKirbyTag {
	panelUrl?: string
	url?: string
	type: 'page' | 'file' | 'external' | 'none'
}

// Navigation target extracted from a parsed KirbyTag
export interface NavigationTarget {
	reference: string
	type: string
}

// KirbyTag parsing result
export interface ParsedKirbyTag {
	_type: string
	href?: string
	uuid?: string
	value?: string
	text?: string
	target?: string
	rel?: string
	title?: string
	class?: string
	[key: string]: unknown
}

// Input validation result - discriminated union for type safety
export type ValidationResult =
	| { type: 'unknown'; text?: string }
	| { type: 'url' | 'email' | 'tel' | 'page' | 'anchor'; href: string; text?: string }

// Dialog field configuration
export interface DialogFieldConfig {
	type: string
	label?: string
	placeholder?: string
	options?: DialogOption[]
	required?: boolean
	width?: string
	[key: string]: unknown
}

export interface DialogOption {
	value: string
	text: string
}

// Registry types for Extension API
export interface RegistryButton {
	name: string
	label: string
	icon: string
	command: (ctx: { editor: Editor }) => void
	activeCheck?: (ctx: { editor: Editor }) => boolean
}

export interface RegistryShortcut {
	name: string
	keys: string[]
	command: (ctx: { editor: Editor }) => boolean | void
}

export interface RegistryExtension {
	name: string
	create: (ctx: TiptapContext) => AnyExtension
	buttons?: () => RegistryButton[]
}

export interface TiptapContext {
	tiptap: {
		core: {
			Extension: any
			Node: any
			Mark: any
			mergeAttributes: any
		}
		vue2: {
			VueNodeViewRenderer: any
		}
	}
	pm: {
		state: {
			Plugin: any
			PluginKey: any
		}
		view: {
			Decoration: any
			DecorationSet: any
		}
	}
}

export interface WindowKirbyTiptapRegistry {
	extensions: RegistryExtension[]
	buttons: RegistryButton[]
	shortcuts: RegistryShortcut[]
}

export interface WindowKirbyTiptap {
	registry: WindowKirbyTiptapRegistry
}

declare global {
	interface Window {
		kirbyTiptap?: WindowKirbyTiptap
	}
}

// Editor type re-export for convenience
export type { Editor }
