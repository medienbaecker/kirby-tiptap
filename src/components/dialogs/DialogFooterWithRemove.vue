<template>
	<k-dialog-footer>
		<k-button-group class="k-dialog-buttons tiptap-dialog-buttons-with-remove">
			<k-button
				class="k-dialog-button-cancel"
				icon="cancel"
				variant="filled"
				@click="$emit('cancel')"
			>
				{{ $t('cancel') }}
			</k-button>
			<k-button
				icon="trash"
				variant="filled"
				theme="negative"
				@click="$emit('remove')"
			>
				{{ $t('remove') }}
			</k-button>
			<k-button
				class="k-dialog-button-submit"
				icon="check"
				variant="filled"
				theme="positive"
				type="submit"
			>
				{{ submitButton }}
			</k-button>
		</k-button-group>
	</k-dialog-footer>
</template>

<script>
export default {
	props: {
		submitButton: {
			type: String,
			required: true
		}
	},
	emits: ["cancel", "remove"]
};
</script>

<style>
.tiptap-dialog-buttons-with-remove {
	grid-template-columns: 1fr 1fr 1fr !important;
}
</style>
