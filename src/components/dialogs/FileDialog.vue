<template>
	<k-dialog v-bind="$props" class="k-model-picker-dialog" v-on="dropListeners" @cancel="$emit('cancel')"
		@submit="submit">
		<header class="k-model-picker-dialog-header">
			<k-dialog-search v-if="hasSearch" :value="query" class="k-model-picker-dialog-search"
				@search="query = $event" />
		</header>

		<k-collection v-bind="collection" />

		<k-dialog-fields v-if="hasFields" class="tiptap-file-dialog-fields" :fields="fieldsForTag" :value="values"
			@input="values = $event" />
	</k-dialog>
</template>

<script>
import { dialogFields, fieldsForTag, valuesForTag } from "../../utils/dialogFields";
import { tagName } from "../../utils/kirbyTags";

/**
 * Kirby's file picker with the dialog fields of a file tag below the files
 */
export default {
	extends: "k-model-picker-dialog",
	props: {
		fields: {
			type: Object,
			default: () => ({})
		},
		file: Object,
		initialValues: {
			type: Object,
			default: () => ({})
		},
		tags: Object
	},
	emits: ["cancel", "drop", "submit"],
	data() {
		return {
			values: { ...this.initialValues }
		};
	},
	computed: {
		dropListeners() {
			return this.$panel.dialog.hasEventListener("drop") ? { drop: (files) => this.$emit("drop", files) } : {};
		},
		fieldsForTag() {
			return fieldsForTag(dialogFields(this.fields, { field: this.payload.field }), this.tag, this.tags);
		},
		hasFields() {
			return this.$helper.object.length(this.fields) > 0;
		},
		picked() {
			return [...this.items, this.file].find((item) => item && this.isSelected(item));
		},
		tag() {
			return this.picked ? tagName(this.picked.dragText) : "";
		}
	},
	methods: {
		submit() {
			this.$emit("submit", {
				file: this.picked,
				values: valuesForTag(this.values, this.tag, this.tags)
			});
		}
	}
};
</script>

<style>
.tiptap-file-dialog-fields {
	margin-top: var(--spacing-6);
}
</style>
