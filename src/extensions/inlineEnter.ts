import { Extension } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export const InlineEnter = Extension.create({
	name: "inlineEnter",
	priority: 101,

	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) =>
				!(editor.state.selection instanceof NodeSelection) &&
				editor.commands.setHardBreak(),
		};
	},
});
