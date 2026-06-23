import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { findKirbyTagRanges } from "../utils/kirbyTags";

const FORMATTING_MARKS = new Set(["bold", "italic", "strike"]);

function charIndexToPos(
	block: ProseMirrorNode,
	contentStart: number,
	charIndex: number
): number {
	let pos = contentStart;
	let chars = 0;
	let found = false;

	block.forEach((child) => {
		if (found) return;
		if (child.isText) {
			const len = child.text?.length ?? 0;
			if (charIndex < chars + len) {
				pos += charIndex - chars;
				found = true;
				return;
			}
			chars += len;
		}
		pos += child.nodeSize;
	});

	return pos;
}

/**
 * Checks whether a KirbyTag can be inserted at the given position.
 */
export function canInsertKirbyTag(state: EditorState, pos?: number): boolean {
	const $pos = pos != null ? state.doc.resolve(pos) : state.selection.$from;

	// No KirbyTags in code contexts
	if ($pos.parent.type.spec.code) return false;

	// No nested KirbyTags
	const parent = $pos.parent;
	const offset = $pos.parentOffset;
	const ranges = findKirbyTagRanges(parent.textContent);
	if (
		ranges.some(([s, e]) => {
			const from = charIndexToPos(parent, 0, s);
			const to = charIndexToPos(parent, 0, e);
			return offset >= from && offset < to;
		})
	)
		return false;

	return true;
}

/**
 * disabledCheck for tag-insertion buttons (link, file): disabled in code
 * contexts and inside existing KirbyTags (no nested tags).
 */
export const kirbyTagDisabledCheck = (editor: Editor): boolean =>
	!canInsertKirbyTag(editor.state);

/**
 * disabledCheck for text-formatting buttons (bold/italic/strike): disabled where
 * inline formatting doesn't belong. Not inside a KirbyTag, though — its text can
 * be formatted. Add future contexts to the list below.
 */
export const formattingDisabledCheck = (editor: Editor): boolean => {
	const inCodeBlock =
		editor.state.selection.$from.parent.type.spec.code === true;
	const inInlineCode = editor.isActive("code");

	return inCodeBlock || inInlineCode;
};

export const InsertionGuards = Extension.create({
	name: "insertionGuards",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("kirbytagMarkStrip"),
				appendTransaction(transactions, _oldState, newState) {
					if (!transactions.some((tr) => tr.docChanged)) return null;

					// A KirbyTag's source must carry uniform marks, or it splits into
					// several text nodes and stops being detected. Strip disallowed
					// marks; for a partial formatting mark, normalize the whole tag.
					const tr = newState.tr;
					let modified = false;
					const { from: selFrom, to: selTo } = newState.selection;

					newState.doc.descendants((node, pos) => {
						if (!node.isTextblock) return;

						const ranges = findKirbyTagRanges(node.textContent);

						for (const [start, end] of ranges) {
							const from = charIndexToPos(node, pos + 1, start);
							const to = charIndexToPos(node, pos + 1, end);

							// Per mark type: how many of the tag's text nodes carry it.
							let textNodes = 0;
							const coverage = new Map<string, number>();
							newState.doc.nodesBetween(from, to, (child) => {
								if (!child.isText) return;
								textNodes++;
								for (const mark of child.marks) {
									const name = mark.type.name;
									coverage.set(name, (coverage.get(name) ?? 0) + 1);
								}
							});

							for (const [name, covered] of coverage) {
								const markType = newState.schema.marks[name];
								if (!markType) continue;

								// Non-formatting marks are never allowed on a tag.
								if (!FORMATTING_MARKS.has(name)) {
									tr.removeMark(from, to, markType);
									modified = true;
									continue;
								}

								// Already uniform across the whole tag — nothing to do.
								if (covered === textNodes) continue;

								// Partial: after a toggle the overlapping selection is fully
								// marked when adding and unmarked when removing, so its mark
								// state tells us which way to normalize the whole tag.
								const overlapFrom = Math.max(selFrom, from);
								const overlapTo = Math.min(selTo, to);
								const wantsMark =
									overlapFrom < overlapTo &&
									newState.doc.rangeHasMark(overlapFrom, overlapTo, markType);

								if (wantsMark) {
									tr.addMark(from, to, markType.create());
								} else {
									tr.removeMark(from, to, markType);
								}
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
