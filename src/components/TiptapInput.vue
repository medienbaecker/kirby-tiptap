<template>
	<div class="k-tiptap-input-wrapper">
		<toolbar v-if="editor && !disabled && allowedButtons.length" v-bind="$props" :editor="editor"
			:buttons="allowedButtons" />
		<editor-content :editor="editor" class="k-tiptap-editor-container" :data-empty="!editor || editor.isEmpty"
			:data-placeholder="placeholder" />
	</div>
</template>

<script>
import { EditorContent } from '@tiptap/vue-2'
import { onMounted, getCurrentInstance, watch, ref } from 'vue'
import Toolbar from './Toolbar.vue'
import { props } from './props.js'
import { useEditor } from '../composables/useEditor'
import { useContent } from '../composables/useContent'
import { createPasteHandler, createDropHandler } from '../utils/eventHandlers'

export default {
	components: { EditorContent, Toolbar },
	props,

	setup(props, { emit }) {
		const instance = getCurrentInstance()
		const lastEmittedJson = ref('')

		const { parseContent, emitContent } = useContent(
			props,
			emit,
			lastEmittedJson
		)

		const { editor, allowedButtons, createEditor } = useEditor(
			props,
			(editor) => emitContent(editor),
			(editor) => emit('editor', editor)
		)

		// Watch for external value changes
		watch(() => props.value, (newValue, oldValue) => {
			if (newValue !== oldValue && newValue !== lastEmittedJson.value) {
				const newContent = parseContent(newValue)
				if (editor.value) {
					editor.value.commands.setContent(newContent, false)
				}
			}
		})

		onMounted(() => {
			const eventHandlers = {
				handlePaste: createPasteHandler(editor, props.links?.options || ['email', 'url']),
				handleDrop: createDropHandler(editor, instance.proxy.$panel, instance.proxy.$helper, props.endpoints, props.uploads, props.uuid)
			}

			const content = parseContent(props.value)
			createEditor(content, eventHandlers)
		})

		const focus = () => {
			editor.value?.commands.focus()
		}

		return {
			editor,
			allowedButtons,
			focus
		}
	},
};
</script>

<style>
/* Making sure the input fills the whole width  */
.k-tiptap-input-wrapper {
	width: 100%;
}

/* Grid container for editor and placeholder */
.k-tiptap-editor-container {
	display: grid;
	grid-template-areas: "content";
}

/* Base styles for the editor */
.tiptap {
	grid-area: content;
	padding: .5rem;
	outline: none;
	width: 100%;
	min-height: var(--tiptap-size);
	line-height: var(--leading-normal);
}

/* Sizes to be configured with the size option */
.k-tiptap-input[data-size="small"] {
	--tiptap-size: 7.5rem;
}

.k-tiptap-input[data-size="medium"] {
	--tiptap-size: 15rem;
}

.k-tiptap-input[data-size="large"] {
	--tiptap-size: 30rem;
}

.k-tiptap-input[data-size="huge"] {
	--tiptap-size: 45rem;
}

/* Placeholder */
.k-tiptap-editor-container[data-placeholder][data-empty="true"]::before {
	grid-area: content;
	content: attr(data-placeholder);
	color: var(--input-color-placeholder);
	pointer-events: none;
	white-space: pre-wrap;
	word-wrap: break-word;
	line-height: var(--leading-normal);
	padding: .5rem;
}

/* Poor man's margin-trim  */
.k-tiptap-input:not([data-inline="true"]) .tiptap>* {
	&:not(:first-child) {
		margin-block-start: calc(1em * var(--leading-normal));
	}

	&:not(:last-child) {
		margin-block-end: calc(var(--text-sm) * var(--leading-normal));
	}
}

/* Headings */
.tiptap h1 {
	font-size: var(--text-h1);
	font-weight: var(--font-h1);
	line-height: var(--leading-h1);
}

.tiptap h2 {
	font-size: var(--text-h2);
	font-weight: var(--font-h2);
	line-height: var(--leading-h2);
}

.tiptap h3 {
	font-size: var(--text-h3);
	font-weight: var(--font-h3);
	line-height: var(--leading-h3);
}

.tiptap h4 {
	font-size: var(--text-h4);
	font-weight: var(--font-h4);
	line-height: var(--leading-h4);
}

.tiptap h5 {
	font-size: var(--text-h5);
	font-weight: var(--font-h5);
	line-height: var(--leading-h5);
}

.tiptap h6 {
	font-size: var(--text-h6);
	font-weight: var(--font-h6);
	line-height: var(--leading-h6);
}

/* Links */
.tiptap a {
	color: var(--link-color);
	text-decoration: underline;
	text-underline-offset: var(--link-underline-offset);
	border-radius: var(--rounded-xs);
	outline-offset: 2px;
}

/* Lists */
.tiptap :where(ul, ol) {
	padding-inline-start: 3ch;
}

.tiptap ul {
	list-style-type: disc;
}

.tiptap ol {
	list-style-type: decimal;
}

/* Task Lists */
.tiptap ul[data-type="taskList"] {
	list-style: none;
	padding-inline-start: 0;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.tiptap ul[data-type="taskList"] ul[data-type="taskList"] {
	margin-block-start: .25rem;
}

.tiptap ul[data-type="taskList"] li {
	display: flex;
	align-items: baseline;
	gap: .5rem;
}

/* Checkbox, aligned with first line */
.tiptap ul[data-type="taskList"] input {
	display: block;
	position: relative;
	top: .2em;
}

/* Label */
.tiptap ul[data-type="taskList"] li>div {
	width: 100%;
}

/* Code */
.tiptap code {
	padding: var(--spacing-1);
	font-size: var(--code-inline-font-size);
	font-family: var(--code-font-family);
	background: var(--color-blue-300);
	color: var(--color-blue-900);
	border-radius: var(--rounded);

	[data-theme="dark"] & {
		background: var(--color-blue-800);
		color: inherit;
	}
}

.tiptap pre code {
	display: block;
}

/* Blockquote */
.tiptap blockquote {
	padding-inline-start: var(--spacing-4);
	--csstools-light-dark-toggle--2: var(--csstools-color-scheme--light) var(--color-border);
	border-inline-start: 2px solid var(--csstools-light-dark-toggle--2, var(--color-black));
}

/* Horizontal rule */
.tiptap hr {
	cursor: pointer;
	height: 1px;
	background-color: currentColor;
	color: var(--color-gray-300);
	margin: 1rem 0;
	position: relative;
	overflow: visible;

	/* Making it a bit easier to click */
	&:after {
		content: '';
		display: block;
		position: absolute;
		top: -.25rem;
		bottom: -.25rem;
		left: -.25rem;
		right: -.25rem;
		opacity: .25;
		border-radius: 20rem;
	}

	&.ProseMirror-selectednode {
		color: var(--color-blue-600);

		&:after {
			background-color: var(--color-blue-400);
		}
	}
}

/* Kirbytags */
.tiptap .kirbytag {
	margin: calc(.1em * -1);
	padding: .1em;
	border-radius: var(--rounded);
	color: var(--color-yellow-900);
	background: var(--color-yellow-200);

	[data-theme=dark] & {
		background: var(--color-yellow-800);
		color: inherit;
	}
}

/* Invisible characters */
.Tiptap-invisible-character {
	display: inline-block;
	position: relative;
	opacity: .33;
}

.Tiptap-invisible-character--soft-hyphen {
	width: 1px;
	height: 1lh;
	background-color: currentColor;
	vertical-align: top;
}

.Tiptap-invisible-character--non-breaking-space {
	vertical-align: baseline;
}

.Tiptap-invisible-character--non-breaking-space::before {
	content: ' ';
	position: absolute;
	height: 1px;
	background-color: currentColor;
}
</style>