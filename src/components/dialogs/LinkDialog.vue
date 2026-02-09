<template>
	<k-dialog v-bind="$props" class="tiptap-link-dialog" @cancel="$emit('cancel')" @submit="submit">
		<k-dialog-fields
			:fields="fields"
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
	methods: {
		submit() {
			this.$emit("submit", this.values);
		}
	}
};
</script>
