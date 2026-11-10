import type { AnyExtension } from "@tiptap/core";
import { tiptapContext } from "./tiptapExports";

const {
	blockquote,
	bold,
	bulletList,
	code,
	codeBlock,
	doc,
	dropCursor,
	gapCursor,
	hardBreak,
	heading,
	horizontalRule,
	italic,
	listItem,
	listKeymap,
	orderedList,
	paragraph,
	strike,
	text,
	undoRedo,
} = tiptapContext.extensions;

const definitions: [AnyExtension, string?][] = [
	[bold, "bold"],
	[blockquote, "blockquote"],
	[bulletList, "bulletList"],
	[code, "code"],
	[codeBlock, "codeBlock"],
	[doc],
	[dropCursor.configure({ width: 2, color: "var(--color-blue-600)" })],
	[gapCursor],
	[hardBreak],
	[heading, "headings"],
	[undoRedo],
	[horizontalRule, "horizontalRule"],
	[italic, "italic"],
	[listItem],
	[listKeymap],
	[orderedList, "orderedList"],
	[paragraph],
	[strike, "strike"],
	[text],
];

export const coreButtons = definitions.flatMap(([, button]) =>
	button ? [button] : []
);

export function coreExtensions(buttons: string[]): AnyExtension[] {
	return definitions
		.filter(([, button]) => !button || buttons.includes(button))
		.map(([extension]) => extension);
}
