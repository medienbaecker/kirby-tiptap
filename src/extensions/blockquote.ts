import { Blockquote as BaseBlockquote } from "@tiptap/extension-blockquote";
import { AllSelection, TextSelection } from "@tiptap/pm/state";

export const Blockquote = BaseBlockquote.extend({
	addCommands() {
		return {
			...this.parent?.(),
			toggleBlockquote:
				() =>
				({ chain }) =>
					chain()
						.command(({ tr }) => {
							if (tr.selection instanceof AllSelection) {
								tr.setSelection(
									TextSelection.between(
										tr.doc.resolve(0),
										tr.doc.resolve(tr.doc.content.size)
									)
								);
							}
							return true;
						})
						.toggleWrap(this.name)
						.run(),
		};
	},
});
