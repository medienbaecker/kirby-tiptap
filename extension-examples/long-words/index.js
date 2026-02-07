/**
 * Example: Highlight long words (soft-hyphen helper)
 *
 * Highlights words longer than 15 characters that may need a soft
 * hyphen for proper line breaking. Useful for languages with long compound words like German.
 *
 * Demonstrates inline ProseMirror decorations via the factory pattern.
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	const MAX_LENGTH = 15;

	function findLongWords(doc, Decoration, DecorationSet) {
		const decorations = [];

		doc.descendants((node, pos) => {
			if (!node.isText) return;
			const regex = /\p{L}+/gu;
			let match;
			while ((match = regex.exec(node.text)) !== null) {
				if (match[0].length > MAX_LENGTH) {
					decorations.push(
						Decoration.inline(
							pos + match.index,
							pos + match.index + match[0].length,
							{
								class: "long-word",
								title: "Long word",
							}
						)
					);
				}
			}
		});

		return DecorationSet.create(doc, decorations);
	}

	window.kirbyTiptap.registry.extensions.push({
		name: "longWords",

		create({ tiptap, pm }) {
			const { Extension } = tiptap.core;
			const { Plugin, PluginKey } = pm.state;
			const { Decoration, DecorationSet } = pm.view;

			const key = new PluginKey("longWords");

			return Extension.create({
				name: "longWords",

				addProseMirrorPlugins() {
					return [
						new Plugin({
							key,
							state: {
								init(_, state) {
									return findLongWords(state.doc, Decoration, DecorationSet);
								},
								apply(tr, old, _, newState) {
									if (!tr.docChanged) return old;
									return findLongWords(newState.doc, Decoration, DecorationSet);
								},
							},
							props: {
								decorations(state) {
									return this.getState(state);
								},
							},
						}),
					];
				},
			});
		},
	});
})();
