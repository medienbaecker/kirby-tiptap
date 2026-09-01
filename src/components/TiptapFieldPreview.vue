<template>
	<div :class="['k-tiptap-field-preview', $options.class, $attrs.class]" :style="$attrs.style">
		{{ column.before }}
		<k-text :html="html" />
		{{ column.after }}
	</div>
</template>

<script>
import { getHTMLFromFragment, getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FieldPreview from "@/mixins/forms/fieldPreview.js";
import { findKirbyTagRanges } from '../utils/kirbyTags';
import { KirbytagRaw, RawMarkdownTable } from '../extensions/rawSource';
import { compileRegistry } from '../utils/registry';
import { starterKitOverrides } from '../utils/starterKit';

const decorateKirbyTags = (html) => {
	const ranges = findKirbyTagRanges(html);
	if (ranges.length === 0) return html;
	let out = '';
	let cursor = 0;
	for (const [start, end] of ranges) {
		out += html.substring(cursor, start);
		out += `<span class="kirbytag">${html.substring(start, end)}</span>`;
		cursor = end;
	}
	return out + html.substring(cursor);
};

// Collapse an inline doc's paragraphs into one, joined by hardBreaks,
// so StarterKit renders the preview on a single line.
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

// The registry doesn't change at runtime — compile the extension set once
// instead of per table cell.
let previewExtensions = null;
const getPreviewExtensions = () => {
	if (!previewExtensions) {
		const { extensions } = compileRegistry();
		// link: false matches the editor schema, so KirbyTags containing
		// URLs stay plain text instead of being autolinked
		previewExtensions = [
			StarterKit.configure(starterKitOverrides({ link: false }, extensions)),
			TaskList,
			TaskItem,
			KirbytagRaw,
			RawMarkdownTable,
			...extensions
		];
	}
	return previewExtensions;
};

let previewSchema = null;
const renderDoc = (doc) => {
	previewSchema ??= getSchema(getPreviewExtensions());
	return getHTMLFromFragment(
		Node.fromJSON(previewSchema, doc).content,
		previewSchema
	);
};

const escapeHtml = (text) =>
	text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

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
			.replace(/\\([\\`*_[\]~])/g, '$1')
			.replace(/\s+/g, ' ')
			.trim()
	);

export default {
	mixins: [FieldPreview],
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
				return decorateKirbyTags(excerpt(this.value ?? ''));
			}
			try {
				const inline = this.field.inline ?? json.inline;
				const doc = inline === true ? flattenInline(json) : json;
				return decorateKirbyTags(renderDoc(doc));
			} catch {
				// Unknown node or broken extension — show raw value, don't crash the table.
				return this.value;
			}
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
}
</style>
