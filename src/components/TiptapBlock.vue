<template>
	<TiptapInput ref="input" :value="textValue" :disabled="disabled" v-bind="fieldConfig" class="k-tiptap-input"
		@input="update({ text: $event.json })" />
</template>

<script>
import TiptapInput from './TiptapInput.vue'

export default {
	components: {
		TiptapInput
	},
	computed: {
		textValue() {
			// Convert reactive object to string if needed
			const text = this.content.text;
			return typeof text === 'string' ? text : (text ? JSON.stringify(text) : '');
		},
		fieldConfig() {
			return this.field("text", {});
		}
	},
	methods: {
		focus() {
			this.$refs.input.focus();
		}
	}
}
</script>

<style>
.k-block-container-type-tiptap {
	padding: 0;
}

.k-block-container-type-tiptap .k-tiptap-input {
	background: none;
	border-radius: 0;
}

.k-block-container-type-tiptap :where(.k-tiptap-input):focus-within .tiptap-toolbar {
	position: static;
	box-shadow: none;
}
</style>