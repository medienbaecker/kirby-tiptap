import Tiptap from "./components/Tiptap.vue";
import TiptapBlock from "./components/TiptapBlock.vue";
import TiptapFieldPreview from "./components/TiptapFieldPreview.vue";

panel.plugin("medienbaecker/tiptap", {
	fields: {
		tiptap: Tiptap,
	},
	blocks: {
		tiptap: TiptapBlock,
	},
	components: {
		"k-tiptap-field-preview": TiptapFieldPreview,
	},
	icons: {
		"code-block":
			'<path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM4 5V19H20V5H4ZM20 12L16.4645 15.5355L15.0503 14.1213L17.1716 12L15.0503 9.87868L16.4645 8.46447L20 12ZM6.82843 12L8.94975 14.1213L7.53553 15.5355L4 12L7.53553 8.46447L8.94975 9.87868L6.82843 12ZM11.2443 17H9.11597L12.7557 7H14.884L11.2443 17Z"></path>',
		"horizontal-rule":
			'<path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
		columns:
			'<path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
	},
});
