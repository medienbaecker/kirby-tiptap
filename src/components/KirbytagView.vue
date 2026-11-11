<template>
	<NodeViewWrapper as="span" class="tiptap-kirbytag" :title="tag.title" data-drag-handle @mousedown="select" @click="edit">
		<Pill v-bind="tag.props" :href="tag.link" tabindex="-1" draggable="false">
			<template v-if="$slots.default" #default><slot /></template>
		</Pill>
	</NodeViewWrapper>
</template>

<script>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { pill } from '../utils/pill';
import Pill from './Pill.vue';

export default {
	components: { NodeViewWrapper, Pill },

	props: nodeViewProps,

	computed: {
		tag() {
			const { endpoints, kirbytagAttributes } = this.extension.options;
			return pill(this.node.attrs.text, endpoints.model, kirbytagAttributes);
		},
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
