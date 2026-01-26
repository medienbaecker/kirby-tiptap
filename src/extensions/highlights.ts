import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { HighlightPattern } from "../types";
import { findKirbyTagRanges } from "../utils/kirbyTags";

interface HighlightsOptions {
	highlights: HighlightPattern[];
	kirbytags?: string[];
}

export const Highlights = Extension.create<HighlightsOptions>({
	name: "highlights",

	addOptions() {
		return {
			highlights: [], // Array of highlight patterns with their classes
			kirbytags: [],
		};
	},

	addProseMirrorPlugins() {
		const { highlights } = this.options;

		return [
			new Plugin({
				key: new PluginKey("highlights"),
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];

						state.doc.descendants((node, pos) => {
							if (!node.isText) return;

							const text = node.text || "";

							// First pass: Find and highlight Kirbytags with balanced parentheses
							const kirbytagPositions = findKirbyTagRanges(text);

							// Add decorations for KirbyTags
							for (const [start, end] of kirbytagPositions) {
								decorations.push(
									Decoration.inline(pos + start, pos + end, {
										class: "kirbytag",
									})
								);
							}

							// Second pass: Apply other highlight patterns
							// Skip any highlights that overlap with Kirbytags
							if (highlights.length > 0) {
								highlights.forEach(({ pattern, class: className, title }) => {
									const regex =
										typeof pattern === "string"
											? new RegExp(pattern, "g")
											: new RegExp(pattern.source, pattern.flags + "g");

									let highlightMatch: RegExpExecArray | null;
									regex.lastIndex = 0;

									while ((highlightMatch = regex.exec(text))) {
										const highlightStart = highlightMatch.index;
										const highlightEnd =
											highlightStart + highlightMatch[0].length;

										// Check if this highlight overlaps with any Kirbytag
										let overlapsWithKirbytag = false;

										for (const [tagStartPos, tagEndPos] of kirbytagPositions) {
											if (
												!(highlightEnd <= tagStartPos || highlightStart >= tagEndPos)
											) {
												overlapsWithKirbytag = true;
												break;
											}
										}

										// Only add non-overlapping highlights
										if (!overlapsWithKirbytag) {
											decorations.push(
												Decoration.inline(
													pos + highlightStart,
													pos + highlightEnd,
													{ class: className, ...(title && { title }) }
												)
											);
										}
									}
								});
							}
						});

						return DecorationSet.create(state.doc, decorations);
					},
				},
			}),
		];
	},
});
