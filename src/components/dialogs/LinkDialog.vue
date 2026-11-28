<template>
	<k-dialog v-bind="$props" class="tiptap-link-dialog" @cancel="$emit('cancel')" @submit="submit">
		<k-dialog-fields
			:fields="fieldsWithTag"
			:value="{ ...values, tag }"
			@input="input"
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
import { visibleValues, withTagField } from "../../utils/dialogFields";
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
		}
	},
	emits: ["cancel", "input", "submit", "remove"],
	data() {
		return {
			values: { ...this.value }
		};
	},
	computed: {
		fieldsWithTag() {
			return withTagField(this.fields);
		},
		tag() {
			return splitHref(this.values.href ?? "").type;
		}
	},
	methods: {
		input({ tag, ...values }) {
			this.values = values;
		},
		submit() {
			this.$emit("submit", visibleValues(this.fields, this.values, this.tag, this.$helper.field.isVisible));
		}
	}
};
</script>
