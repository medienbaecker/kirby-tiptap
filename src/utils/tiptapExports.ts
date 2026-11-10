import { Extension, Node, Mark, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, VueNodeViewRenderer } from "@tiptap/vue-3";
import { Plugin, PluginKey, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Heading } from "@tiptap/extension-heading";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import InvisibleCharacters from "@tiptap/extension-invisible-characters";
import { Italic } from "@tiptap/extension-italic";
import { BulletList, ListItem, ListKeymap, OrderedList } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Strike } from "@tiptap/extension-strike";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Text } from "@tiptap/extension-text";
import { Dropcursor, Gapcursor, UndoRedo } from "@tiptap/extensions";
import { Blockquote } from "../extensions/blockquote";
import { FileDialog } from "../extensions/fileDialog";
import { Highlights } from "../extensions/highlights";
import { InsertionGuards } from "../extensions/insertionGuards";
import { Kirbytag } from "../extensions/kirbytag";
import KirbytagView from "../components/KirbytagView.vue";
import { parseKirbyTag } from "./kirbyTags";
import { target } from "./pill";
import { LinkDialog } from "../extensions/linkDialog";
import { KirbytagRaw, RawMarkdownTable } from "../extensions/rawSource";
import { Replacements } from "../extensions/replacements";
import type { TiptapContext } from "../types";

export const tiptapContext: TiptapContext = {
	tiptap: {
		core: { Extension, Node, Mark, mergeAttributes },
		vue3: { NodeViewWrapper, VueNodeViewRenderer },
	},
	pm: {
		state: { Plugin, PluginKey, NodeSelection, TextSelection },
		view: { Decoration, DecorationSet },
	},
	extensions: Object.fromEntries(
		[
			Blockquote,
			Bold,
			BulletList,
			Code,
			CodeBlock,
			Document,
			Dropcursor,
			FileDialog,
			Gapcursor,
			HardBreak,
			Heading,
			Highlights,
			HorizontalRule,
			InsertionGuards,
			InvisibleCharacters,
			Italic,
			Kirbytag,
			KirbytagRaw,
			LinkDialog,
			ListItem,
			ListKeymap,
			OrderedList,
			Paragraph,
			RawMarkdownTable,
			Replacements,
			Strike,
			TaskItem,
			TaskList,
			Text,
			UndoRedo,
		].map((extension) => [extension.name, extension])
	),
	components: { KirbytagView },
	kirbytags: { parse: parseKirbyTag, target },
};
