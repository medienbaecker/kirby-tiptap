import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Mark, Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";
import type { Component } from "vue";
import KirbytagView from "../components/KirbytagView.vue";
import { findKirbyTagRanges, isFileTag, isLinkTag, isPillTag } from "../utils/kirbyTags";
import { seedModelItem } from "../utils/items";
import { target } from "../utils/pill";
import type { ModelItem } from "../utils/items";
import type { EndpointsConfig, KirbytagsMap, TiptapDocument, TiptapNode } from "../types";

interface KirbytagOptions {
	endpoints?: EndpointsConfig;
	kirbytagAttributes?: KirbytagsMap;
	items?: Record<string, ModelItem>;
	tags?: string[];
}

const tagsToNodes = (state: EditorState, tags: string[] = []): Transaction | null => {
	const replacements: { from: number; to: number; text: string; marks: readonly Mark[] }[] = [];

	state.doc.descendants((node, pos) => {
		if (node.type.spec.code) return false;
		if (!node.isText || !node.text || node.marks.some((mark) => mark.type.spec.code && mark.type.name !== "kirbytagRaw")) return;

		for (const [start, end] of findKirbyTagRanges(node.text)) {
			const text = node.text.slice(start, end);
			if (isPillTag(text, tags)) {
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

const tidySpacesAfterMove = (transaction: Transaction, state: EditorState): Transaction | null => {
	const { selection } = state;
	const [removal] = transaction.steps;
	if (
		transaction.getMeta("uiEvent") !== "drop" ||
		!(selection instanceof NodeSelection) ||
		selection.node.type.name !== "kirbytag" ||
		!(removal instanceof ReplaceStep) ||
		removal.slice.size > 0
	) {
		return null;
	}

	const charAt = (pos: number) => {
		const $pos = state.doc.resolve(pos);
		return pos >= $pos.start() && pos < $pos.end() ? state.doc.textBetween(pos, pos + 1, undefined, "\ufffc") : "";
	};

	const fixes: { pos: number; insert?: string; remove?: boolean }[] = [];

	const origin = transaction.mapping.slice(1).map(removal.from);
	const before = charAt(origin - 1);
	const after = charAt(origin);
	if (before === " " && (after === " " || after === "" || /[.,;:!?)]/.test(after))) {
		fixes.push({ pos: origin - 1, remove: true });
	} else if (before === "" && after === " ") {
		fixes.push({ pos: origin, remove: true });
	}

	if (/[^\s(]/.test(charAt(selection.from - 1))) fixes.push({ pos: selection.from, insert: " " });
	if (/[\p{L}\p{N}]/u.test(charAt(selection.to))) fixes.push({ pos: selection.to, insert: " " });

	if (!fixes.length) return null;

	const tidy = state.tr;
	for (const fix of fixes.sort((a, b) => b.pos - a.pos)) {
		if (fix.remove) tidy.delete(fix.pos, fix.pos + 1);
		if (fix.insert) tidy.insertText(fix.insert, fix.pos);
	}
	return tidy.setSelection(NodeSelection.create(tidy.doc, tidy.mapping.map(selection.from)));
};

const caretBesidePill = (state: EditorState): { position: number; side: "before" | "after" } | null => {
	const { empty, $from } = state.selection;
	if (!empty) return null;
	if ($from.nodeAfter?.type.name === "kirbytag") return { position: $from.pos, side: "before" };
	if ($from.nodeBefore?.type.name === "kirbytag") return { position: $from.pos, side: "after" };
	return null;
};

const textRects = (element: HTMLElement): DOMRect[] => {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const rects: DOMRect[] = [];
	for (let text = walker.nextNode(); text; text = walker.nextNode()) {
		const range = document.createRange();
		range.selectNodeContents(text);
		rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
	}
	return rects;
};

const drawPillCaret = (view: EditorView, caret: HTMLElement): HTMLElement | null => {
	const beside = caretBesidePill(view.state);
	const pill = beside && view.nodeDOM(beside.side === "before" ? beside.position : beside.position - 1);
	caret.hidden = !(pill instanceof HTMLElement);
	if (!(pill instanceof HTMLElement) || !beside) return null;

	const pillRects = pill.getClientRects();
	const letters = textRects(pill);
	const edge = beside.side === "before" ? pillRects[0] : pillRects[pillRects.length - 1];
	const line = (beside.side === "before" ? letters[0] : letters[letters.length - 1]) ?? edge;
	const container = caret.offsetParent?.getBoundingClientRect();
	if (!edge || !line || !container) return pill;

	const atLeft = (beside.side === "before") !== (getComputedStyle(pill).direction === "rtl");
	const left = `${(atLeft ? edge.left - 1 : edge.right) - container.left}px`;
	const top = `${line.top - container.top}px`;
	if (caret.style.left !== left || caret.style.top !== top) caret.getAnimations().forEach((animation) => (animation.currentTime = 0));
	caret.style.left = left;
	caret.style.top = top;
	caret.style.height = `${line.height}px`;
	return pill;
};

const scrollEdge = 24;

const scrollContainer = (element: HTMLElement): Element => {
	for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
		if (/auto|scroll/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
	}
	return document.scrollingElement as Element;
};

const visibleArea = (container: Element) =>
	container === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : container.getBoundingClientRect();

const gapAround = (view: EditorView, position: number, top: number): { above: number; below: number } | null => {
	const { doc } = view.state;
	const $position = doc.resolve(position);
	const block = view.nodeDOM($position.before());
	if (!(block instanceof HTMLElement)) return null;

	const { top: blockTop, bottom: blockBottom } = block.getBoundingClientRect();
	if (top >= blockTop && top <= blockBottom) return null;
	if (top < blockTop) {
		return { above: Selection.findFrom(doc.resolve($position.before()), -1, true)?.head ?? $position.start(), below: $position.start() };
	}
	return { above: $position.end(), below: Selection.findFrom(doc.resolve($position.after()), 1, true)?.head ?? $position.end() };
};

export const extendsSelection = (view: EditorView, event: MouseEvent): boolean =>
	event.shiftKey && view.hasFocus() && view.state.selection.$anchor.parent.inlineContent;

// https://discuss.prosemirror.net/t/cursor-appears-in-the-wrong-position-in-chrome-98/4409
const selectByDragging = (view: EditorView, event: MouseEvent): boolean => {
	if (!view.editable || event.button !== 0 || event.detail > 1 || event.altKey || event.metaKey || event.ctrlKey) return false;
	const extend = extendsSelection(view, event);
	const pill = extend ? (event.target as Element).closest(".tiptap-kirbytag") : null;
	if (!pill && (event.target as Element).closest("[contenteditable]")?.getAttribute("contenteditable") === "false") return false;

	const pillPosition = pill ? view.posAtDOM(pill, 0) : null;
	const clicked = pillPosition === null
		? view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
		: pillPosition < view.state.selection.anchor ? pillPosition : pillPosition + 1;
	if (clicked === undefined || !view.state.doc.resolve(clicked).parent.inlineContent) return false;

	const gap = extend ? null : gapAround(view, clicked, event.clientY);
	const { empty, from, to } = view.state.selection;
	if (!extend && !gap && !empty && clicked > from && clicked < to) return false;

	const anchor = extend ? view.state.selection.anchor : clicked;

	const container = scrollContainer(view.dom);
	let pointer = { left: event.clientX, top: event.clientY };
	let frame = 0;
	let moved = false;

	const select = (head: number) => {
		moved ||= head !== clicked;
		const { doc, selection } = view.state;
		const from = gap && head !== clicked ? (head > gap.below ? gap.below : gap.above) : anchor;
		const next = TextSelection.between(doc.resolve(from), doc.resolve(head));
		if (!selection.eq(next)) view.dispatch(view.state.tr.setSelection(next));
	};
	const follow = () => {
		const { top, bottom } = visibleArea(container);
		const overshoot = Math.min(pointer.top - top - scrollEdge, 0) || Math.max(pointer.top - bottom + scrollEdge, 0);
		container.scrollTop += Math.max(-20, Math.min(20, overshoot));
		const head = view.posAtCoords({ left: pointer.left, top: Math.min(Math.max(pointer.top, top + 1), bottom - 1) })?.pos;
		if (head !== undefined) select(head);
		frame = overshoot ? requestAnimationFrame(follow) : 0;
	};
	const move = (moveEvent: MouseEvent) => {
		if (moveEvent.buttons === 0) return up();
		pointer = { left: moveEvent.clientX, top: moveEvent.clientY };
		if (!frame) follow();
	};
	const up = (upEvent?: MouseEvent) => {
		cancelAnimationFrame(frame);
		window.removeEventListener("mousemove", move);
		window.removeEventListener("mouseup", up);
		if (upEvent && !moved && !extend) view.someProp("handleClick", (handleClick) => handleClick(view, clicked, upEvent));
	};

	event.preventDefault();
	view.focus();
	select(clicked);
	window.addEventListener("mousemove", move);
	window.addEventListener("mouseup", up);
	return true;
};

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		kirbytag: {
			/**
			 * Opens the link or file dialog for the selected kirbytag; other tags stay selected
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
				({ editor, state, commands }) => {
					const { selection } = state;
					if (!editor.isEditable) return false;
					if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) return false;

					if (isLinkTag(selection.node.attrs.text)) return commands.openLinkDialog();
					if (isFileTag(selection.node.attrs.text)) return commands.openFileDialog();
					return true;
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
						const transaction = tagsToNodes(view.state, this.options.tags);
						if (transaction) {
							view.dispatch(transaction.setMeta("addToHistory", false).setMeta("preventUpdate", true));
						}
					});

					const caret = document.createElement("div");
					caret.className = "tiptap-pill-caret";
					caret.hidden = true;
					view.dom.after(caret);
					let pill: HTMLElement | null = null;
					const draw = () => {
						const next = drawPillCaret(view, caret);
						if (next === pill) return;
						pill = next;
						pillChanges.disconnect();
						if (pill) pillChanges.observe(pill, { subtree: true, childList: true, characterData: true, attributes: true });
					};
					const resize = new ResizeObserver(draw);
					const pillChanges = new MutationObserver(() => drawPillCaret(view, caret));
					resize.observe(view.dom);

					return {
						update: draw,
						destroy: () => {
							resize.disconnect();
							pillChanges.disconnect();
							caret.remove();
						},
					};
				},
				appendTransaction: (transactions, _, state) => {
					if (!transactions.some((transaction) => transaction.docChanged)) return null;
					return tidySpacesAfterMove(transactions[transactions.length - 1], state) ?? tagsToNodes(state, this.options.tags);
				},
				props: {
					attributes: (state): Record<string, string> => (caretBesidePill(state) ? { "data-pill-caret": "" } : {}),
					handleDOMEvents: {
						mousedown: selectByDragging,
					},
				},
			}),
		];
	},
});
