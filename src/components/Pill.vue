<template>
	<component :is="href ? 'a' : 'span'" :href="href" :data-theme="theme" class="k-tiptap-pill">
		<span class="k-tiptap-pill-start">
			<k-image-frame v-if="image.src" v-bind="image" class="k-tiptap-pill-image" />
			<k-icon-frame v-else v-bind="image" class="k-tiptap-pill-image" />
		</span>{{ text }}<span v-if="$slots.default" class="k-tiptap-pill-end"><slot /></span>
	</component>
</template>

<script>
/**
 * A KirbyTag shown inline: it wraps like text and keeps its icon or image,
 * and the default slot, on the line of the text next to them.
 */
export default {
	props: {
		href: String,
		image: Object,
		text: String,
		theme: String
	}
};
</script>

<style>
.k-tiptap-pill {
	--pill-color-back: var(--panel-color-back);
	--pill-color-icon: currentColor;

	padding: 2px var(--spacing-1) 2px 0;
	background: var(--pill-color-back);
	border-radius: var(--rounded-sm);
	-webkit-box-decoration-break: clone;
	box-decoration-break: clone;
	overflow-wrap: anywhere;
	user-select: none;
}

.k-tiptap-pill[data-theme="negative"] {
	--pill-color-back: light-dark(var(--theme-color-300), var(--theme-color-850));
	--pill-color-icon: var(--theme-color-icon);
}

.k-tiptap-pill-start,
.k-tiptap-pill-end {
	position: relative;
}

.k-tiptap-pill-start {
	padding-inline-start: calc(1lh + var(--spacing-1));
}

.k-tiptap-pill-end {
	padding-inline-start: 1.425em;
}

.k-tiptap-pill-image {
	position: absolute;
	top: -2px;
	inset-inline-start: 0;
	inline-size: 1lh;
	block-size: 1lh;
	color: var(--pill-color-icon);
	border-start-start-radius: var(--rounded-sm);
	border-end-start-radius: var(--rounded-sm);
}

.k-tiptap-pill-end > * {
	position: absolute;
	inset-inline-end: 0;
	top: 50%;
	translate: 0 -50%;
}
</style>
