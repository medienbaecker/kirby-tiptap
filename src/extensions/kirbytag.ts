import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Mark, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";
import type { Component } from "vue";
import KirbytagView from "../components/KirbytagView.vue";
import { findKirbyTagRanges, isFileTag, isLinkTag } from "../utils/kirbyTags";
import { seedModelItem } from "../utils/items";
import { target } from "../utils/pill";
import type { ModelItem } from "../utils/items";
import type { EndpointsConfig, KirbytagsMap, TiptapDocument, TiptapNode } from "../types";

interface KirbytagOptions {
	endpoints?: EndpointsConfig;
	kirbytagAttributes?: KirbytagsMap;
	items?: Record<string, ModelItem>;
}

const tagsToNodes = (state: EditorState): Transaction | null => {
	const replacements: { from: number; to: number; text: string; marks: readonly Mark[] }[] = [];

	state.doc.descendants((node, pos) => {
		if (node.type.spec.code) return false;
		if (!node.isText || !node.text || node.marks.some((mark) => mark.type.spec.code && mark.type.name !== "kirbytagRaw")) return;

		for (const [start, end] of findKirbyTagRanges(node.text)) {
			const text = node.text.slice(start, end);
			if (isFileTag(text) || isLinkTag(text)) {
				replacements.push({ from: pos + start, to: pos + end, text, marks: node.marks });
			}
		}
	});

	if (!replacements.length) return null;

	const transaction = state.tr;
	for (const { from, to, text, marks } of replacements.reverse()) {
		transaction.replaceWith(from, to, state.schema.nodes.kirbytag.create({ text }, null, marks));
	}
	return transaction;
};

/**
 * Turns kirbytag nodes back into text, so the stored value stays plain KirbyTags
 */
export const kirbytagsToText = (doc: TiptapDocument): TiptapDocument => {
	const convert = (nodes: TiptapNode[]): TiptapNode[] =>
		nodes
			.map((node) =>
				node.type === "kirbytag"
					? { type: "text", text: node.attrs?.text as string, ...(node.marks ? { marks: node.marks } : {}) }
					: node.content
						? { ...node, content: convert(node.content) }
						: node
			)
			.reduce<TiptapNode[]>((merged, node) => {
				const previous = merged[merged.length - 1];
				if (previous?.type === "text" && node.type === "text" && JSON.stringify(previous.marks) === JSON.stringify(node.marks)) {
					previous.text += node.text ?? "";
				} else {
					merged.push({ ...node });
				}
				return merged;
			}, []);

	return { ...doc, content: convert(doc.content ?? []) };
};

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		kirbytag: {
			/**
			 * Opens the link or file dialog for the selected kirbytag
			 */
			editKirbytag: () => ReturnType;
		};
	}
}

export const Kirbytag = Node.create<KirbytagOptions>({
	name: "kirbytag",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	draggable: true,

	addOptions() {
		return {
			endpoints: undefined,
			kirbytagAttributes: undefined,
			items: undefined,
		};
	},

	addAttributes() {
		return {
			text: { default: "", rendered: false },
		};
	},

	extendNodeSchema() {
		return {
			leafText: (node: ProseMirrorNode) => node.attrs.text,
		};
	},

	parseHTML() {
		return [{ tag: "span[data-kirbytag]", getAttrs: (element) => ({ text: element.getAttribute("data-kirbytag") }) }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return ["span", mergeAttributes(HTMLAttributes, { "data-kirbytag": node.attrs.text }), node.attrs.text];
	},

	renderText({ node }) {
		return node.attrs.text;
	},

	addCommands() {
		return {
			editKirbytag:
				() =>
				({ state, commands }) => {
					const { selection } = state;
					if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) return false;

					return isLinkTag(selection.node.attrs.text) ? commands.openLinkDialog() : commands.openFileDialog();
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			Enter: () => this.editor.commands.editKirbytag(),
			Space: () => this.editor.commands.editKirbytag(),
		};
	},

	addNodeView() {
		return VueNodeViewRenderer(KirbytagView as Component<NodeViewProps>);
	},

	onBeforeCreate() {
		const model = this.options.endpoints!.model!;
		for (const [tag, item] of Object.entries(this.options.items ?? {})) {
			const linked = target(tag, model, this.options.kirbytagAttributes);
			if (linked) seedModelItem(linked.endpoint, linked.id, item);
		}
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("kirbytag"),
				view: (view) => {
					queueMicrotask(() => {
						const transaction = tagsToNodes(view.state);
						if (transaction) {
							view.dispatch(transaction.setMeta("addToHistory", false).setMeta("preventUpdate", true));
						}
					});
					return {};
				},
				appendTransaction: (transactions, _, state) =>
					transactions.some((transaction) => transaction.docChanged) ? tagsToNodes(state) : null,
			}),
		];
	},
});
