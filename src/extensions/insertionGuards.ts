import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { findKirbyTagRanges } from "../utils/kirbyTags";

/**
 * Checks whether a KirbyTag can be inserted at the given position.
 */
export function canInsertKirbyTag(state: EditorState, pos?: number): boolean {
	const $pos = pos != null ? state.doc.resolve(pos) : state.selection.$from;

	// No KirbyTags in code contexts
	if ($pos.parent.type.spec.code) return false;

	// No nested KirbyTags
	const text = $pos.parent.textContent;
	const offset = $pos.parentOffset;
	const ranges = findKirbyTagRanges(text);
	if (ranges.some(([s, e]) => offset >= s && offset < e)) return false;

	return true;
}

/**
 * Ready-to-use disabledCheck for toolbar buttons that should be
 * disabled in code contexts or inside existing KirbyTags.
 */
export const kirbyTagDisabledCheck = (editor: Editor): boolean =>
	!canInsertKirbyTag(editor.state);

export const InsertionGuards = Extension.create({
	name: "insertionGuards",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("kirbytagMarkStrip"),
				appendTransaction(transactions, _oldState, newState) {
					if (!transactions.some((tr) => tr.docChanged)) return null;

					// Strip marks from KirbyTag ranges
					const tr = newState.tr;
					let modified = false;

					newState.doc.descendants((node, pos) => {
						if (!node.isTextblock) return;

						const text = node.textContent;
						const ranges = findKirbyTagRanges(text);

						for (const [start, end] of ranges) {
							const from = pos + 1 + start;
							const to = pos + 1 + end;

							let hasMarks = false;
							newState.doc.nodesBetween(from, to, (child) => {
								if (child.isText && child.marks.length > 0)
									hasMarks = true;
							});

							if (hasMarks) {
								tr.removeMark(from, to);
								modified = true;
							}
						}
					});

					return modified ? tr : null;
				},
			}),
		];
	},
});
