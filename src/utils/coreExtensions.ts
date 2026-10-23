import type { AnyExtension } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Heading } from "@tiptap/extension-heading";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Italic } from "@tiptap/extension-italic";
import {
	BulletList,
	ListItem,
	ListKeymap,
	OrderedList,
} from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Strike } from "@tiptap/extension-strike";
import { Text } from "@tiptap/extension-text";
import { Dropcursor, Gapcursor, UndoRedo } from "@tiptap/extensions";
import { Blockquote } from "../extensions/blockquote";

const definitions: [AnyExtension, string?][] = [
	[Bold, "bold"],
	[Blockquote, "blockquote"],
	[BulletList, "bulletList"],
	[Code, "code"],
	[CodeBlock, "codeBlock"],
	[Document],
	[Dropcursor.configure({ width: 2, color: "var(--color-blue-600)" })],
	[Gapcursor],
	[HardBreak],
	[Heading, "headings"],
	[UndoRedo],
	[HorizontalRule, "horizontalRule"],
	[Italic, "italic"],
	[ListItem],
	[ListKeymap],
	[OrderedList, "orderedList"],
	[Paragraph],
	[Strike, "strike"],
	[Text],
];

export const coreButtons = definitions.flatMap(([, button]) =>
	button ? [button] : []
);

export function coreExtensions(
	buttons: string[],
	registryExtensions: { name?: string }[]
): AnyExtension[] {
	return definitions
		.filter(
			([extension, button]) =>
				(!button || buttons.includes(button)) &&
				!registryExtensions.some((ext) => ext.name === extension.name)
		)
		.map(([extension]) => extension);
}
