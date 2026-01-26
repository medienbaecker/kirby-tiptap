import type { Editor } from '@tiptap/vue-2'
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
	highlights?: HighlightPattern[]
	customButtons?: Record<string, CustomButtonConfig>
	kirbytags?: string[]
	links?: LinksConfig
	files?: FilesConfig
	endpoints?: EndpointsConfig
	uploads?: UploadsConfig | false
	uuid?: UuidConfig
}

// Highlight configuration
export interface HighlightPattern {
	pattern: string | RegExp
	class: string
	title?: string
}

// Custom button configuration
export interface CustomButtonConfig {
	icon?: string
	title?: string
	attributes?: Record<string, NodeAttributeConfig>
	nodes?: string[]
}

export interface NodeAttributeConfig {
	default?: unknown
	rendered?: boolean
	parseHTML?: (element: Element) => unknown
	renderHTML?: (attributes: Record<string, unknown>) => Record<string, unknown> | null
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
export type ButtonGroup = 'text' | 'blocks' | 'lists' | 'custom'

export interface ButtonMeta {
	icon: string
	group: ButtonGroup
	buttonName?: string
	buttonConfig?: CustomButtonConfig
}

export interface ButtonRegistryEntry {
	component: () => Promise<{ default: Component }>
	meta: ButtonMeta
}

export interface ButtonRegistry {
	getButton(name: string): ButtonRegistryEntry | undefined
	getAllButtons(): Map<string, ButtonRegistryEntry>
	hasButton(name: string): boolean
	registerCustomButtons(buttons: Record<string, CustomButtonConfig> | undefined): void
}

// Button item types for field configuration
export type ButtonItem =
	| string           // Core buttons: 'bold', 'italic', '|', etc.
	| HeadingsButton   // { headings: [1, 2, 3] }
	| CustomButtonItem // { type: 'className', className: '...', ... }

export interface HeadingsButton {
	headings: number[]
}

export interface CustomButtonItem {
	type: string
	className?: string
	icon?: string
	title?: string
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

// Editor type re-export for convenience
export type { Editor }
