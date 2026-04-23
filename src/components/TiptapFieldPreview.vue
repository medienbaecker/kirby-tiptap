<template>
	<div :class="['k-tiptap-field-preview', $options.class, $attrs.class]" :style="$attrs.style">
		{{ column.before }}
		<k-text :html="html" />
		{{ column.after }}
	</div>
</template>

<script>
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import FieldPreview from "@/mixins/forms/fieldPreview.js";
import { findKirbyTagRanges } from '../utils/kirbyTags';

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
				: i === 0 ? node.content : [{ type: 'hardBreak' }, ...node.content]
		)
	}]
});

export default {
	mixins: [FieldPreview],
	props: {
		value: String
	},
	computed: {
		html() {
			const json = JSON.parse(this.value);
			const doc = json.inline === true ? flattenInline(json) : json;
			return decorateKirbyTags(generateHTML(doc, [StarterKit]));
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
