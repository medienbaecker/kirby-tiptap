<template>
	<k-field class="k-tiptap-field" data-theme="field" :name="name" type="tiptap" v-bind="$props"
		:counter="counterOptions">
		<k-input-element>
			<div :data-disabled="disabled" :data-size="size" :data-inline="inline" class="k-input k-tiptap-input">
				<TiptapInput ref="input" v-bind="$props" @input="handleInput" @editor="editor = $event" />
			</div>
		</k-input-element>
	</k-field>
</template>

<script>
import TiptapInput from './TiptapInput.vue'
import { props } from './props.js'
import { getVisibleText } from '../utils/kirbyTags'
import counter from "@/mixins/forms/counter.js";

export default {
	mixins: [counter],
	components: { TiptapInput },
	data() {
		return {
			editor: null
		}
	},

	computed: {
		counterValue() {
			// Count reader-visible text so the counter matches the
			// server-side min/maxlength validation.
			return getVisibleText(this.editor?.getText() || '', this.kirbytags);
		}
	},

	created() {
		if (this.inline === true && this.format === 'markdown') {
			console.warn(
				`kirby-tiptap: field "${this.name}" has inline: true and format: markdown, ` +
				`so tiptapText() will wrap it in <p>. Use tiptapTextInline() in your template.`
			);
		}
	},

	mounted() {
		this.$el.querySelector('label')?.addEventListener('click', this.focus);
	},
	beforeDestroy() {
		this.$el.querySelector('label')?.removeEventListener('click', this.focus);
	},
	methods: {
		focus() {
			this.$refs.input.focus();
		},
		handleInput(value) {
			this.$emit('input', value.json);
		}
	},
	props,
	emits: ['input']
}
</script>
