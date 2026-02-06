import { Extension, Node, Mark, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-2";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { TiptapContext } from "../types";

export const tiptapContext: TiptapContext = {
	tiptap: {
		core: { Extension, Node, Mark, mergeAttributes },
		vue2: { VueNodeViewRenderer },
	},
	pm: {
		state: { Plugin, PluginKey },
		view: { Decoration, DecorationSet },
	},
};
