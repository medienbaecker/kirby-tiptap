import { ref, shallowRef, computed, onUnmounted, type Ref, type ComputedRef } from "vue";
import { Editor } from "@tiptap/vue-3";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import InvisibleCharacters from "@tiptap/extension-invisible-characters";
import {
	KirbytagRaw,
	RawMarkdownTable,
} from "../extensions/rawSource";
import type { AnyExtension } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";
import { Highlights } from "../extensions/highlights";
import {
	SoftHyphenCharacter,
	NonBreakingSpaceCharacter,
} from "../extensions/invisibles";
import { Replacements } from "../extensions/replacements";
import { InsertionGuards } from "../extensions/insertionGuards";
import { compileRegistry } from "../utils/registry";
import { buttonRegistry } from "../utils/buttonRegistry";
import { transformLinksToKirbyTags } from "../utils/pasteTransform";
import { coreExtensions } from "../utils/coreExtensions";
import type {
	TiptapDocument,
	ButtonItem,
	EndpointsConfig,
	KirbytagsMap,
} from "../types";

interface EditorProps {
	buttons: ButtonItem[];
	inline?: boolean;
	format?: "json" | "markdown";
	kirbytags?: KirbytagsMap;
	spellcheck?: boolean;
	endpoints?: EndpointsConfig;
}

interface EventHandlers {
	handlePaste: (
		view: EditorView,
		event: ClipboardEvent,
		slice: Slice
	) => boolean | void;
	handleDrop: (
		view: EditorView,
		event: DragEvent,
		slice: Slice,
		moved: boolean
	) => boolean | void;
}

interface UseEditorReturn {
	editor: Ref<Editor | null>;
	allowedButtons: ComputedRef<ButtonItem[]>;
	createEditor: (
		initialContent: TiptapDocument | string,
		eventHandlers: EventHandlers
	) => void;
}

// Object buttons configure a core button, so they must count as that button
const buttonName = (btn: ButtonItem): string =>
	typeof btn === "string" ? btn : "headings" in btn ? "headings" : btn.type;

/**
 * Composable for Tiptap editor configuration and management
 */
export function useEditor(
	props: EditorProps,
	onContentUpdate: (editor: Editor) => void,
	onEditorCreate: (editor: Editor) => void
): UseEditorReturn {
	// Use any for the ref to avoid deep type instantiation issues with Tiptap
	const editor = shallowRef<Editor | null>(null) as Ref<Editor | null>;

	/**
	 * Returns filtered buttons based on inline mode
	 */
	const allowedButtons = computed<ButtonItem[]>(() => {
		// Kirby's Markdown parser has no task list syntax, so the button
		// would produce content that renders as literal "[x]" on the frontend
		const buttons =
			props.format === "markdown"
				? props.buttons.filter((btn) => buttonName(btn) !== "taskList")
				: props.buttons;

		if (!props.inline) {
			return buttons;
		}

		const blockElements = [
			"headings",
			"codeBlock",
			"blockquote",
			"bulletList",
			"orderedList",
			"taskList",
			"image",
			"horizontalRule",
		];

		return buttons
			.filter((btn) => !blockElements.includes(buttonName(btn)))
			.filter((btn, i, arr) => {
				// Remove separators at beginning or end
				return btn !== "|" || (i !== 0 && i !== arr.length - 1);
			});
	});

	/**
	 * Creates the Tiptap editor with all extensions and configurations
	 */
	const createEditor = (
		initialContent: TiptapDocument | string,
		eventHandlers: EventHandlers
	) => {
		try {
			const { extensions: registryExtensions, buttons: registryButtons } =
				compileRegistry();
			if (registryButtons.length > 0) {
				buttonRegistry.registerRegistryButtons(registryButtons);
			}

			const isMarkdown = props.format === "markdown";

			const extensions: AnyExtension[] = [
				...coreExtensions(allowedButtons.value.map(buttonName), registryExtensions),
				Highlights.configure({
					kirbytags: props.kirbytags,
					endpoints: props.endpoints,
				}),
				InvisibleCharacters.configure({
					injectCSS: false,
					builders: [
						new SoftHyphenCharacter(),
						new NonBreakingSpaceCharacter(),
					],
				}),
				Replacements,
				InsertionGuards.configure({ format: props.format }),
			];

			// Markdown fields need the schema nodes even without the button,
			// so stored JSON task lists load and survive saves
			if (
				allowedButtons.value.some((btn) => buttonName(btn) === "taskList") ||
				props.format === "markdown"
			) {
				extensions.push(
					TaskList,
					TaskItem.configure({
						nested: true,
					})
				);
			}

			// Append registry extensions
			if (registryExtensions.length > 0) {
				extensions.push(...registryExtensions);
			}

			if (isMarkdown) {
				extensions.push(KirbytagRaw, RawMarkdownTable);
			}

			const newEditor = new Editor({
				content: initialContent,
				...(isMarkdown ? { contentType: "markdown" as const } : {}),
				extensions,
				editorProps: {
					handlePaste: eventHandlers.handlePaste,
					handleDrop: eventHandlers.handleDrop,
					transformPastedHTML: (html: string) => transformLinksToKirbyTags(html),
				},
				onCreate: ({ editor: editorInstance }) => {
					editorInstance.view.dom.setAttribute(
						"spellcheck",
						String(props.spellcheck)
					);
					onEditorCreate(editorInstance as unknown as Editor);
				},
				onUpdate: ({ editor: editorInstance }) =>
					onContentUpdate(editorInstance as unknown as Editor),
			});

			editor.value = newEditor as unknown as Editor;
		} catch (error) {
			editor.value = null;
			throw error;
		}
	};

	onUnmounted(() => {
		editor.value?.destroy();
	});

	return {
		editor,
		allowedButtons,
		createEditor,
	};
}
