<template>
	<k-dialog v-bind="$props" class="tiptap-link-dialog" @cancel="$emit('cancel')" @submit="submit">
		<k-dialog-fields
			:fields="fieldsForTag"
			:value="values"
			@input="values = $event"
			@submit="submit"
		/>
		<template v-if="removable" #footer>
			<DialogFooterWithRemove :submit-button="submitButton" @cancel="$emit('cancel')" @remove="$emit('remove')" />
		</template>
	</k-dialog>
</template>

<script>
import Dialog from "@/mixins/dialog.js";
import { props as FieldsProps } from "@/components/Dialogs/Elements/Fields.vue";
import DialogFooterWithRemove from "./DialogFooterWithRemove.vue";
import { fieldsForTag, valuesForTag } from "../../utils/dialogFields";
import { splitHref } from "../../utils/inputValidation";

export default {
	components: { DialogFooterWithRemove },
	mixins: [Dialog, FieldsProps],
	props: {
		fields: {
			type: Object,
			default: () => ({})
		},
		size: {
			type: String,
			default: "medium"
		},
		submitButton: {
			default: () => window.panel.t("insert")
		},
		removable: {
			type: Boolean,
			default: false
		},
		tags: Object
	},
	emits: ["cancel", "input", "submit", "remove"],
	data() {
		return {
			values: { ...this.value }
		};
	},
	computed: {
		fieldsForTag() {
			const { href, ...attributes } = this.fields;
			return { href, ...fieldsForTag(attributes, this.tag, this.tags) };
		},
		tag() {
			return splitHref(this.values.href ?? "").type;
		}
	},
	methods: {
		submit() {
			const { href, ...attributes } = this.values;
			this.$emit("submit", { href, ...valuesForTag(attributes, this.tag, this.tags) });
		}
	}
};
</script>
