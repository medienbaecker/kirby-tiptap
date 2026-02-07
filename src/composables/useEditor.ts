import { ref, computed, onUnmounted, type Ref, type ComputedRef } from "vue";
import { Editor } from "@tiptap/vue-2";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import InvisibleCharacters from "@tiptap/extension-invisible-characters";
import type { AnyExtension } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";
import { Highlights } from "../extensions/highlights";
import {
	SoftHyphenCharacter,
	NonBreakingSpaceCharacter,
} from "../extensions/invisibles";
import { Replacements } from "../extensions/replacements";
import { compileRegistry } from "../utils/registry";
import { buttonRegistry } from "../utils/buttonRegistry";
import type { TiptapDocument, ButtonItem, EndpointsConfig } from "../types";

interface EditorProps {
	buttons: ButtonItem[];
	inline?: boolean;
	kirbytags?: string[];
	spellcheck?: boolean;
	endpoints?: EndpointsConfig;
}

interface EventHandlers {
	handlePaste: (view: EditorView, event: ClipboardEvent, slice: Slice) => boolean | void;
	handleDrop: (view: EditorView, event: DragEvent, slice: Slice, moved: boolean) => boolean | void;
}

interface UseEditorReturn {
	editor: Ref<Editor | null>;
	allowedButtons: ComputedRef<ButtonItem[]>;
	starterKitConfig: ComputedRef<Record<string, unknown>>;
	createEditor: (initialContent: TiptapDocument | string, eventHandlers: EventHandlers) => void;
	destroyEditor: () => void;
}

/**
 * Composable for Tiptap editor configuration and management
 */
export function useEditor(
	props: EditorProps,
	onContentUpdate: (editor: Editor) => void,
	onEditorCreate: (editor: Editor) => void
): UseEditorReturn {
	// Use any for the ref to avoid deep type instantiation issues with Tiptap
	const editor = ref<Editor | null>(null) as Ref<Editor | null>;

	/**
	 * Returns filtered buttons based on inline mode
	 */
	const allowedButtons = computed<ButtonItem[]>(() => {
		if (!props.inline) {
			return props.buttons;
		}

		const blockElements = [
			"codeBlock",
			"blockquote",
			"bulletList",
			"orderedList",
			"taskList",
			"image",
			"horizontalRule",
		];

		return props.buttons
			.filter((btn) => {
				// Handle object buttons (headings, paragraphClass, etc.)
				if (typeof btn === "object") {
					if ("headings" in btn) {
						return false;
					}
				}
				// Handle string buttons
				return typeof btn !== "string" || !blockElements.includes(btn);
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
		const buttons = allowedButtons.value;
		const has = (name: string) => buttons.includes(name);
		const hasHeadings = buttons.some(btn => typeof btn === "object" && btn !== null && "headings" in btn);

		// StarterKit expects false to disable, or options object to configure
		return {
			dropcursor: { width: 2, color: "var(--color-blue-600)" },
			heading: hasHeadings ? {} : false,
			bold: has("bold") ? {} : false,
			italic: has("italic") ? {} : false,
			strike: has("strike") ? {} : false,
			code: has("code") ? {} : false,
			codeBlock: has("codeBlock") ? {} : false,
			blockquote: has("blockquote") ? {} : false,
			bulletList: has("bulletList") ? {} : false,
			orderedList: has("orderedList") ? {} : false,
			horizontalRule: has("horizontalRule") ? {} : false,
			link: false as const,
			underline: false as const,
			trailingNode: false as const,
		};
	});

	/**
	 * Creates the Tiptap editor with all extensions and configurations
	 */
	const createEditor = (initialContent: TiptapDocument | string, eventHandlers: EventHandlers) => {
		try {
			// Compile third-party extensions first so we can disable overridden StarterKit extensions
			const { extensions: registryExtensions, buttons: registryButtons } = compileRegistry();
			if (registryButtons.length > 0) {
				buttonRegistry.registerRegistryButtons(registryButtons);
			}

			// Disable StarterKit extensions that registry extensions replace
			const starterKitNames = new Set([
				'blockquote', 'bold', 'bulletList', 'code', 'codeBlock',
				'document', 'dropcursor', 'gapcursor', 'hardBreak', 'heading',
				'history', 'horizontalRule', 'italic', 'listItem', 'orderedList',
				'paragraph', 'strike', 'text'
			]);
			const skConfig: Record<string, unknown> = { ...starterKitConfig.value };
			for (const ext of registryExtensions) {
				if (ext.name && starterKitNames.has(ext.name)) {
					skConfig[ext.name] = false;
				}
			}

			const extensions: AnyExtension[] = [
				StarterKit.configure(skConfig),
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
			];

			// Add TaskList extensions if taskList button is enabled
			if (allowedButtons.value.includes("taskList")) {
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

			const newEditor = new Editor({
				content: initialContent,
				extensions,
				editorProps: {
					handlePaste: eventHandlers.handlePaste,
					handleDrop: eventHandlers.handleDrop,
				},
				onCreate: ({ editor: editorInstance }) => {
					editorInstance.view.dom.setAttribute("spellcheck", String(props.spellcheck));
					onEditorCreate(editorInstance as unknown as Editor);
				},
				onUpdate: ({ editor: editorInstance }) => onContentUpdate(editorInstance as unknown as Editor),
			});

			editor.value = newEditor as unknown as Editor;
		} catch (error) {
			editor.value = null;
			throw error;
		}
	};

	const destroyEditor = () => {
		editor.value?.destroy();
	};

	onUnmounted(() => {
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
