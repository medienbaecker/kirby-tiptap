<template>
	<NodeViewWrapper as="span" class="tiptap-kirbytag" :title="tag.title" data-drag-handle @mousedown="select" @click="edit">
		<k-tag v-bind="attributes" />
	</NodeViewWrapper>
</template>

<script>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { pill } from '../utils/pill';

export default {
	components: { NodeViewWrapper },

	props: nodeViewProps,

	computed: {
		tag() {
			const { endpoints, kirbytagAttributes } = this.extension.options;
			return pill(this.node.attrs.text, endpoints.model, kirbytagAttributes);
		},

		attributes() {
			const { props, link } = this.tag;
			return link ? { ...props, element: "a", href: link, tabindex: -1, draggable: "false" } : props;
		}
	},

	methods: {
		select() {
			this.editor.chain().setNodeSelection(this.getPos()).focus(undefined, { scrollIntoView: false }).run();
		},

		edit(event) {
			if (event.metaKey || event.ctrlKey || event.shiftKey) return;
			event.preventDefault();
			this.editor.chain().setNodeSelection(this.getPos()).editKirbytag().run();
		}
	}
};
</script>
