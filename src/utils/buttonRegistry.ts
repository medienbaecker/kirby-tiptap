import type { ButtonRegistryEntry, ButtonMeta, RegistryButton } from "../types";

const coreButtons: Record<string, ButtonRegistryEntry> = {
	headings: {
		component: () => import('../components/toolbarButtons/HeadingsButton.vue'),
		meta: { icon: 'title', group: 'text' }
	},
	bold: {
		component: () => import('../components/toolbarButtons/BoldButton.vue'),
		meta: { icon: 'bold', group: 'text' }
	},
	italic: {
		component: () => import('../components/toolbarButtons/ItalicButton.vue'),
		meta: { icon: 'italic', group: 'text' }
	},
	strike: {
		component: () => import('../components/toolbarButtons/StrikeButton.vue'),
		meta: { icon: 'strikethrough', group: 'text' }
	},
	code: {
		component: () => import('../components/toolbarButtons/CodeButton.vue'),
		meta: { icon: 'code', group: 'text' }
	},
	codeBlock: {
		component: () => import('../components/toolbarButtons/CodeBlockButton.vue'),
		meta: { icon: 'code-block', group: 'blocks' }
	},
	blockquote: {
		component: () => import('../components/toolbarButtons/BlockquoteButton.vue'),
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
		component: () => import('../components/toolbarButtons/BulletListButton.vue'),
		meta: { icon: 'list-bullet', group: 'lists' }
	},
	orderedList: {
		component: () => import('../components/toolbarButtons/OrderedListButton.vue'),
		meta: { icon: 'list-numbers', group: 'lists' }
	},
	taskList: {
		component: () => import('../components/toolbarButtons/TaskListButton.vue'),
		meta: { icon: 'checklist', group: 'lists' }
	},
	horizontalRule: {
		component: () => import('../components/toolbarButtons/HorizontalRuleButton.vue'),
		meta: { icon: 'horizontal-rule', group: 'blocks' }
	},
	removeFormatting: {
		component: () => import('../components/toolbarButtons/RemoveFormattingButton.vue'),
		meta: { icon: 'remove-formatting', group: 'text' }
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
