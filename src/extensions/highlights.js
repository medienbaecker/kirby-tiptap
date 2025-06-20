import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const Highlights = Extension.create({
	name: "highlights",

	addOptions() {
		return {
			highlights: [], // Array of highlight patterns with their classes
		};
	},

	addProseMirrorPlugins() {
		const { highlights } = this.options;

		// Matches Kirbytags with format: (tagname: content)
		// Where tagname consists of lowercase letters only
		const kirbytagRegex = /\([a-z]+:\s[^)]*\)/g;

		return [
			new Plugin({
				key: new PluginKey("highlights"),
				props: {
					decorations: (state) => {
						const decorations = [];

						state.doc.descendants((node, pos) => {
							if (!node.isText) return;

							// First pass: Find and highlight Kirbytags
							let kirbytagMatch;
							const text = node.text;
							kirbytagRegex.lastIndex = 0;

							// Store Kirbytag positions to check for overlaps later
							const kirbytagPositions = [];

							while ((kirbytagMatch = kirbytagRegex.exec(text))) {
								const start = kirbytagMatch.index;
								const end = start + kirbytagMatch[0].length;

								kirbytagPositions.push([start, end]);

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

									let highlightMatch;
									regex.lastIndex = 0;

									while ((highlightMatch = regex.exec(text))) {
										const highlightStart = highlightMatch.index;
										const highlightEnd =
											highlightStart + highlightMatch[0].length;

										// Check if this highlight overlaps with any Kirbytag
										let overlapsWithKirbytag = false;

										for (const [tagStart, tagEnd] of kirbytagPositions) {
											if (
												!(highlightEnd <= tagStart || highlightStart >= tagEnd)
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
