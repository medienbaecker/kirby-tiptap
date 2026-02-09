import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { EndpointsConfig } from "../types";
import {
	findKirbyTagRanges,
	findReferenceRange,
	parseKirbyTag,
	getNavigationTarget,
	navigateToKirbyTag,
	checkKirbyTagReferences,
} from "../utils/kirbyTags";
import type { Panel } from "kirby-types";

interface HighlightsOptions {
	kirbytags?: string[];
	endpoints?: EndpointsConfig;
}

export const Highlights = Extension.create<HighlightsOptions>({
	name: "highlights",

	addOptions() {
		return {
			kirbytags: [],
			endpoints: undefined,
		};
	},

	addProseMirrorPlugins() {
		const { endpoints } = this.options;

		const resolvedCache = new Map<string, boolean>();
		const pendingRefs = new Map<string, string>();
		let debounceTimer: ReturnType<typeof setTimeout> | null = null;
		let activeView: EditorView | null = null;

		const getPanel = () => (window as unknown as { panel: Panel }).panel;

		const flushPendingRefs = async () => {
			if (!pendingRefs.size || !endpoints) return;

			const batch = Array.from(pendingRefs, ([reference, type]) => ({
				reference,
				type,
			}));
			pendingRefs.clear();

			try {
				const results = await checkKirbyTagReferences(
					batch,
					endpoints,
					getPanel()
				);
				for (const [ref, resolvable] of Object.entries(results)) {
					resolvedCache.set(ref, resolvable);
				}
			} catch {
				for (const { reference } of batch) {
					resolvedCache.set(reference, false);
				}
			}

			if (activeView) {
				activeView.dispatch(
					activeView.state.tr.setMeta("resolvedRefsUpdated", true)
				);
			}
		};

		const scheduleFlush = () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(flushPendingRefs, 300);
		};

		const isResolved = (reference: string, type: string): boolean => {
			if (type === "external") return true;
			if (resolvedCache.has(reference)) return resolvedCache.get(reference)!;

			pendingRefs.set(reference, type);
			scheduleFlush();
			return false;
		};

		return [
			new Plugin({
				key: new PluginKey("highlights"),
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];

						state.doc.descendants((node, pos) => {
							if (!node.isText) return;

							const text = node.text || "";
							const kirbytagPositions = findKirbyTagRanges(text);

							for (const [start, end] of kirbytagPositions) {
								const tagText = text.substring(start, end);
								const parsed = parseKirbyTag(tagText);
								const navTarget = getNavigationTarget(parsed);

								decorations.push(
									Decoration.inline(pos + start, pos + end, {
										class: "kirbytag",
										"data-tag-id": String(pos + start),
									})
								);

								if (
									navTarget &&
									isResolved(navTarget.reference, navTarget.type)
								) {
									const refRange = findReferenceRange(tagText);
									if (refRange) {
										decorations.push(
											Decoration.inline(
												pos + start + refRange[0],
												pos + start + refRange[1],
												{
													class: "kirbytag-ref",
													"data-ref": navTarget.reference,
													"data-type": navTarget.type,
												}
											)
										);
									}
								}
							}
						});

						return DecorationSet.create(state.doc, decorations);
					},
				},
			}),

			new Plugin({
				key: new PluginKey("kirbytagNavigation"),
				view(editorView) {
					activeView = editorView;
					const dom = editorView.dom;
					const toggle = (e: KeyboardEvent) => {
						if (e.key === "Meta" || e.key === "Control") {
							dom.classList.toggle("cmd-held", e.type === "keydown");
						}
					};
					const clear = () => dom.classList.remove("cmd-held");

					document.addEventListener("keydown", toggle);
					document.addEventListener("keyup", toggle);
					window.addEventListener("blur", clear);

					return {
						destroy() {
							activeView = null;
							if (debounceTimer) clearTimeout(debounceTimer);
							document.removeEventListener("keydown", toggle);
							document.removeEventListener("keyup", toggle);
							window.removeEventListener("blur", clear);
						},
					};
				},
				props: {
					handleDOMEvents: {
						mousedown: (_view: EditorView, event: MouseEvent) => {
							if (!event.metaKey && !event.ctrlKey) return false;

							const el = (event.target as Element).closest?.(
								".kirbytag-ref"
							) as HTMLElement | null;
							if (!el) return false;

							const reference = el.dataset.ref;
							const type = el.dataset.type;
							if (!reference || !type) return false;

							event.preventDefault();
							event.stopPropagation();

							if (type === "external") {
								window.open(reference, "_blank");
							} else {
								navigateToKirbyTag({ reference, type }, endpoints, getPanel());
							}

							return true;
						},
					},
				},
			}),
		];
	},
});
