<template>
	<div :class="['k-tiptap-field-preview', $options.class, $attrs.class]" :style="$attrs.style">
		{{ column.before }}
		<k-text :text="$h(html)" />
		{{ column.after }}
	</div>
</template>

<script>
import { getHTMLFromFragment, getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import FieldPreview from "@/mixins/forms/fieldPreview.js";
import { h, render, watchEffect } from 'vue';
import { findKirbyTagRanges, isFileTag, isLinkTag } from '../utils/kirbyTags';
import { pill } from '../utils/pill';
import { compileRegistry, withRegistry } from '../utils/registry';
import { coreButtons, coreExtensions } from '../utils/coreExtensions';
import { tiptapContext } from '../utils/tiptapExports';

const decorateKirbyTags = (html, visual = false) => {
	const ranges = findKirbyTagRanges(html);
	if (ranges.length === 0) return html;
	let out = '';
	let cursor = 0;
	for (const [start, end] of ranges) {
		const tag = html.substring(start, end);
		out += html.substring(cursor, start);
		out += visual && (isFileTag(tag) || isLinkTag(tag)) && !tag.includes('<')
			? `<span class="tiptap-kirbytag" data-kirbytag="${tag.replaceAll('"', '&quot;')}"></span>`
			: `<span class="kirbytag">${tag}</span>`;
		cursor = end;
	}
	return out + html.substring(cursor);
};

// Collapse an inline doc's paragraphs into one, joined by hardBreaks,
// so the preview renders on a single line.
const flattenInline = (json) => ({
	type: 'doc',
	content: [{
		type: 'paragraph',
		content: json.content.flatMap((node, i) =>
			node.type !== 'paragraph'
				? [node]
				: i === 0 ? (node.content ?? []) : [{ type: 'hardBreak' }, ...(node.content ?? [])]
		)
	}]
});

// The registry doesn't change at runtime: one schema per set of field
// options instead of per table cell.
const schemas = new Map();
const previewSchema = (options = {}) => {
	const key = JSON.stringify(options);
	if (!schemas.has(key)) {
		const { extensions } = compileRegistry();
		const { kirbytagRaw, rawSource, taskItem, taskList } = tiptapContext.extensions;
		schemas.set(key, getSchema(withRegistry([
			...coreExtensions(coreButtons),
			taskList,
			taskItem,
			kirbytagRaw,
			rawSource
		], extensions, options)));
	}
	return schemas.get(key);
};

const renderDoc = (doc, options) => {
	const schema = previewSchema(options);
	return getHTMLFromFragment(Node.fromJSON(schema, doc).content, schema);
};

const escapeHtml = (text) =>
	text.replace(/&(?!#?[0-9a-zA-Z]+;)|[<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

// A cell is one truncated line; a parser here would only be a second chance
// to disagree with the one the site renders with
const excerpt = (markdown) =>
	escapeHtml(
		markdown
			.replace(/^```[\s\S]*?^```/gm, ' ')
			.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
			.replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, ' ')
			.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/(\*\*|__|~~|`)(.+?)\1/g, '$2')
			.replace(/(^|[^\\])[*_]([^*_]+)[*_]/g, '$1$2')
			.replace(/\\([\\`*_{}[\]()>#+\-.!|~])/g, '$1')
			.replace(/\s+/g, ' ')
			.trim()
	);

export default {
	mixins: [FieldPreview],
	inheritAttrs: false,
	props: {
		value: String
	},
	computed: {
		html() {
			let json;
			try {
				json = JSON.parse(this.value);
			} catch {
				// Markdown (format: markdown) or legacy plain-text value
				return decorateKirbyTags(excerpt(this.value ?? ''), this.field.kirbytags === false);
			}
			try {
				const inline = this.field.inline ?? json.inline;
				const doc = inline === true ? flattenInline(json) : json;
				return decorateKirbyTags(renderDoc(doc, this.field.extensions), this.field.kirbytags === false);
			} catch {
				// Unknown node or broken extension — show raw value, don't crash the table.
				return this.value;
			}
		}
	},
	watch: {
		html: {
			handler: 'mountPills',
			flush: 'post'
		}
	},
	mounted() {
		this.mountPills();
	},
	unmounted() {
		this.unmountPills();
	},
	methods: {
		mountPills() {
			this.unmountPills();

			const component = this.$.appContext.components['k-tag'];
			const model = this.$panel.view.props.api;

			this.pills = [...this.$el.querySelectorAll('[data-kirbytag]')].map((slot) => ({
				slot,
				stop: watchEffect(() => {
					const { title, props } = pill(slot.dataset.kirbytag, model, this.field.kirbytagAttributes);
					const vnode = h(component, props);
					vnode.appContext = this.$.appContext;
					render(vnode, slot);
					slot.title = title;
				})
			}));
		},
		unmountPills() {
			for (const { slot, stop } of this.pills ?? []) {
				stop();
				render(null, slot);
			}
			this.pills = [];
		}
	}
};
</script>

<style>
.k-tiptap-field-preview {
	padding: 0.375rem var(--table-cell-padding);

	.kirbytag {
		border-radius: var(--rounded);
		color: light-dark(var(--color-yellow-900), inherit);
		background: light-dark(var(--color-yellow-200), var(--color-yellow-800));
	}

	.tiptap-kirbytag img {
		border-radius: 0;
	}
}
</style>
