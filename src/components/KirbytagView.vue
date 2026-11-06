<template>
	<NodeViewWrapper as="span" class="tiptap-kirbytag" :title="tag.title" data-drag-handle @mousedown="select" @click="edit">
		<k-tag v-bind="tag.props" />
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
		}
	},

	methods: {
		select() {
			this.editor.chain().setNodeSelection(this.getPos()).focus(undefined, { scrollIntoView: false }).run();
		},

		edit() {
			this.editor.chain().setNodeSelection(this.getPos()).editKirbytag().run();
		}
	}
};
</script>
