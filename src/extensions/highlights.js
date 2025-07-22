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

		// Matches KirbyTag components for balanced parentheses parsing
		// Group 1: tag starts like "(image:" or "(tel:"
		// Group 2: opening parentheses "("
		// Group 3: closing parentheses ")"
		const kirbytagRegex = /(\([a-z0-9_-]+:)|(\()|(\))/gi;

		return [
			new Plugin({
				key: new PluginKey("highlights"),
				props: {
					decorations: (state) => {
						const decorations = [];

						state.doc.descendants((node, pos) => {
							if (!node.isText) return;

							// First pass: Find and highlight Kirbytags with balanced parentheses
							const text = node.text;
							const kirbytagPositions = [];
							
							// Track nesting level to handle parentheses in tag content
							kirbytagRegex.lastIndex = 0;
							
							let level = 0;
							let inTag = false;
							let tagStart = -1;
							let kirbytagMatch;

							while ((kirbytagMatch = kirbytagRegex.exec(text))) {
								if (!inTag && kirbytagMatch[1]) {
									// Tag start: begin tracking this KirbyTag
									inTag = true;
									level = 1;
									tagStart = kirbytagMatch.index;
								} else if (inTag && (kirbytagMatch[1] || kirbytagMatch[2])) {
									// Opening parenthesis: increase nesting level
									level += 1;
								} else if (inTag && kirbytagMatch[3]) {
									// Closing parenthesis: decrease nesting level
									level -= 1;

									if (level === 0) {
										// All parentheses balanced: complete the KirbyTag
										const start = tagStart;
										const end = kirbytagMatch.index + kirbytagMatch[0].length;

										kirbytagPositions.push([start, end]);

										decorations.push(
											Decoration.inline(pos + start, pos + end, {
												class: "kirbytag",
											})
										);

										inTag = false;
										tagStart = -1;
									}
								}
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
