import type { ButtonRegistryEntry, RegistryButton } from "../types";
import {
	formattingDisabledCheck,
	kirbyTagDisabledCheck,
} from "../extensions/insertionGuards";
import type { Editor } from "@tiptap/core";

/**
 * Buttons that only toggle an editor command render a plain ToolbarButton
 * straight from this config (`simple`). Buttons with their own UI
 * (dropdowns, dialogs) load a dedicated component instead.
 */
const coreButtons: Record<string, ButtonRegistryEntry> = {
	headings: {
		component: () => import('../components/toolbarButtons/HeadingsButton.vue'),
		meta: { icon: 'title', group: 'text' }
	},
	bold: {
		simple: {
			title: 'toolbar.button.bold',
			command: 'toggleBold',
			activeCheck: 'bold',
			disabledCheck: formattingDisabledCheck
		},
		meta: { icon: 'bold', group: 'text' }
	},
	italic: {
		simple: {
			title: 'toolbar.button.italic',
			command: 'toggleItalic',
			activeCheck: 'italic',
			disabledCheck: formattingDisabledCheck
		},
		meta: { icon: 'italic', group: 'text' }
	},
	strike: {
		simple: {
			title: 'toolbar.button.strike',
			command: 'toggleStrike',
			activeCheck: 'strike',
			disabledCheck: formattingDisabledCheck
		},
		meta: { icon: 'strikethrough', group: 'text' }
	},
	code: {
		simple: {
			title: 'toolbar.button.code',
			command: 'toggleCode',
			activeCheck: 'code',
			disabledCheck: kirbyTagDisabledCheck
		},
		meta: { icon: 'code', group: 'text' }
	},
	codeBlock: {
		simple: {
			title: 'tiptap.toolbar.button.codeBlock',
			command: 'toggleCodeBlock',
			activeCheck: 'codeBlock'
		},
		meta: { icon: 'code-block', group: 'blocks' }
	},
	blockquote: {
		simple: {
			title: 'tiptap.toolbar.button.blockquote',
			command: 'toggleBlockquote',
			activeCheck: 'blockquote'
		},
		meta: { icon: 'quote', group: 'blocks' }
	},
	link: {
		component: () => import('../components/toolbarButtons/LinkButton.vue'),
		meta: { icon: 'url', group: 'text' }
	},
	file: {
		component: () => import('../components/toolbarButtons/FileButton.vue'),
		meta: { icon: 'image', group: 'blocks' }
	},
	image: {
		component: () => import('../components/toolbarButtons/FileButton.vue'),
		meta: { icon: 'image', group: 'blocks' }
	},
	bulletList: {
		simple: {
			title: 'toolbar.button.ul',
			command: 'toggleBulletList',
			activeCheck: 'bulletList'
		},
		meta: { icon: 'list-bullet', group: 'lists' }
	},
	orderedList: {
		simple: {
			title: 'toolbar.button.ol',
			command: 'toggleOrderedList',
			activeCheck: 'orderedList'
		},
		meta: { icon: 'list-numbers', group: 'lists' }
	},
	taskList: {
		simple: {
			title: 'tiptap.toolbar.button.taskList',
			command: 'toggleTaskList',
			activeCheck: 'taskList'
		},
		meta: { icon: 'checklist', group: 'lists' }
	},
	horizontalRule: {
		simple: {
			title: 'tiptap.toolbar.button.horizontalRule',
			command: 'setHorizontalRule',
			activeCheck: 'horizontalRule'
		},
		meta: { icon: 'horizontal-rule', group: 'blocks' }
	},
	removeFormatting: {
		simple: {
			title: 'toolbar.button.clear',
			command: (editor: Editor) =>
				editor.chain().focus().clearNodes().unsetAllMarks().run()
		},
		meta: { icon: 'clear', group: 'text' }
	}
};

const registryButtons: Record<string, ButtonRegistryEntry> = {};

export const buttonRegistry = {
	getButton(name: string): ButtonRegistryEntry | undefined {
		return registryButtons[name] || coreButtons[name];
	},

	getAllButtons(): Map<string, ButtonRegistryEntry> {
		return new Map(Object.entries({ ...coreButtons, ...registryButtons }));
	},

	hasButton(name: string): boolean {
		return name in coreButtons || name in registryButtons;
	},

	registerRegistryButtons(buttons: RegistryButton[]): void {
		for (const button of buttons) {
			if (!button.name) {
				console.warn("[kirby-tiptap] Skipping registry button with no name");
				continue;
			}
			if (button.name in coreButtons) {
				console.info(`[kirby-tiptap] Registry button "${button.name}" overrides core button`);
			}
			if (button.name in registryButtons) {
				continue;
			}
			registryButtons[button.name] = {
				component: () => import('../components/toolbarButtons/RegistryButton.vue'),
				meta: {
					icon: button.icon || 'puzzle',
					group: 'registry',
					buttonName: button.name,
					buttonConfig: button
				}
			};
		}
	}
};
