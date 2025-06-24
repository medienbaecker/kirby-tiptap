import { ref, computed, onBeforeUnmount } from "vue";
import { Editor } from "@tiptap/vue-2";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { InvisibleCharacters } from "@tiptap-pro/extension-invisible-characters";
import { Highlights } from "../extensions/highlights";
import {
	SoftHyphenCharacter,
	NonBreakingSpaceCharacter,
} from "../extensions/invisibles";
import { Replacements } from "../extensions/replacements";
import { NodeAttributes } from "../extensions/nodeAttributes";

/**
 * Composable for Tiptap editor configuration and management
 * @param {Object} props - Component props
 * @param {Object} sanitizer - Content sanitizer instance
 * @param {Function} onContentUpdate - Callback for content updates
 * @param {Function} onEditorCreate - Callback for editor creation
 * @returns {Object} Editor instance and configuration
 */
export function useEditor(props, sanitizer, onContentUpdate, onEditorCreate) {
	const editor = ref(null);

	/**
	 * Returns filtered buttons based on inline mode
	 */
	const allowedButtons = computed(() => {
		if (!props.inline) {
			return props.buttons;
		}

		const blockElements = [
			"codeBlock",
			"blockquote",
			"bulletList",
			"orderedList",
			"image",
			"horizontalRule",
		];

		return props.buttons
			.filter((btn) => {
				// Handle object buttons (headings, paragraphClass, etc.)
				if (typeof btn === "object") {
					// Filter out headings and paragraphClass (block-level features)
					if ("headings" in btn || btn.type === "paragraphClass") {
						return false;
					}
				}
				// Handle string buttons
				return !blockElements.includes(btn);
			})
			.filter((btn, i, arr) => {
				// Remove separators at beginning or end
				return btn !== "|" || (i !== 0 && i !== arr.length - 1);
			});
	});

	/**
	 * Returns StarterKit configuration based on allowed buttons
	 */
	const starterKitConfig = computed(() => {
		const defaultConfig = {
			dropcursor: {
				width: 2,
				color: "var(--color-blue-600)",
			},
		};

		const buttonConfigs = {
			heading: (btn) =>
				typeof btn === "object" ? "headings" in btn : btn === "headings",
			bold: "bold",
			italic: "italic",
			strike: "strike",
			code: "code",
			codeBlock: "codeBlock",
			blockquote: "blockquote",
			bulletList: "bulletList",
			orderedList: "orderedList",
			horizontalRule: "horizontalRule",
		};

		return Object.entries(buttonConfigs).reduce(
			(config, [feature, buttonName]) => {
				if (typeof buttonName === "function") {
					config[feature] = allowedButtons.value.some(buttonName);
				} else {
					config[feature] = allowedButtons.value.includes(buttonName);
				}
				return config;
			},
			defaultConfig
		);
	});

	/**
	 * Creates the Tiptap editor with all extensions and configurations
	 */
	const createEditor = (initialContent, eventHandlers) => {
		try {
			const extensions = [
				StarterKit.configure(starterKitConfig.value),
				Placeholder.configure({
					placeholder: props.placeholder,
				}),
				Highlights.configure({
					kirbytags: props.kirbytags,
					highlights: props.highlights,
				}),
				InvisibleCharacters.configure({
					injectCSS: false,
					builders: [
						new SoftHyphenCharacter(),
						new NonBreakingSpaceCharacter(),
					],
				}),
				Replacements,
			];

			// Only add NodeAttributes extension if custom buttons are configured
			if (props.customButtons && Object.keys(props.customButtons).length > 0) {
				extensions.push(
					NodeAttributes.configure({
						customButtons: props.customButtons,
					})
				);
			}

			editor.value = new Editor({
				content: initialContent,
				extensions,
				editorProps: {
					transformPasted: (content) => sanitizer.sanitizeContent(content),
					handlePaste: eventHandlers.handlePaste,
					handleDrop: eventHandlers.handleDrop,
				},
				onCreate: ({ editor }) => {
					editor.view.dom.setAttribute("spellcheck", props.spellcheck);
					onEditorCreate(editor);
				},
				onUpdate: ({ editor }) => onContentUpdate(editor),
			});
		} catch (error) {
			console.error("Failed to create Tiptap editor:", error);
			editor.value = null;
		}
	};

	/**
	 * Destroys the editor instance
	 */
	const destroyEditor = () => {
		editor.value?.destroy();
	};

	onBeforeUnmount(() => {
		destroyEditor();
	});

	return {
		editor,
		allowedButtons,
		starterKitConfig,
		createEditor,
		destroyEditor,
	};
}
