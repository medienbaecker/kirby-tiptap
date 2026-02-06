/**
 * Example: Advanced extension — Word count
 *
 * Demonstrates the factory pattern for full Tiptap access.
 * Creates an Extension that tracks word count via storage,
 * plus a toolbar button that shows the current count.
 *
 * The create() factory receives kirby-tiptap's bundled modules so you
 * don't need to import @tiptap/core yourself (which would cause
 * duplicate bundle issues).
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 *     - wordCount
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	window.kirbyTiptap.registry.extensions.push({
		name: "wordCount",

		// Factory — called at editor init with kirby-tiptap's bundled modules
		create({ tiptap }) {
			const { Extension } = tiptap.core;

			return Extension.create({
				name: "wordCount",

				addStorage() {
					return { count: 0 };
				},

				onUpdate() {
					const text = this.editor.state.doc.textContent;
					this.storage.count = text.split(/\s+/).filter(Boolean).length;
				},
			});
		},

		// Co-located toolbar button — returned alongside the extension
		buttons: () => [
			{
				name: "wordCount",
				label: "Word Count",
				icon: "info",
				command: ({ editor }) => {
					const count = editor.storage.wordCount?.count ?? 0;
					// Using alert() for simplicity — a real extension would
					// use a Panel notification or dialog instead.
					window.alert("Words: " + count);
				},
			},
		],
	});
})();
