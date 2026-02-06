/**
 * Example: Advanced extension — Custom callout node
 *
 * Registers a new block-level node type that wraps content in a styled
 * callout box. Demonstrates:
 *   - Creating a custom Node via the factory pattern
 *   - parseHTML / renderHTML for round-tripping
 *   - A toolbar button with activeCheck for toggle state
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 *     - callout
 *
 * Note: Custom nodes are rendered in the Panel editor but tiptapText()
 * won't render them on the frontend unless you add a matching snippet
 * in site/snippets/tiptap/callout.php.
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	window.kirbyTiptap.registry.extensions.push({
		name: "callout",

		create({ tiptap }) {
			const { Node, mergeAttributes } = tiptap.core;

			return Node.create({
				name: "callout",
				group: "block",
				content: "block+",
				defining: true,

				parseHTML() {
					return [{ tag: "div[data-callout]" }];
				},

				renderHTML({ HTMLAttributes }) {
					return [
						"div",
						mergeAttributes(HTMLAttributes, { "data-callout": "" }),
						0,
					];
				},
			});
		},

		buttons: () => [
			{
				name: "callout",
				label: "Callout",
				icon: "alert",
				command: ({ editor }) => {
					editor.chain().focus().toggleWrap("callout").run();
				},
				// Highlight button when cursor is inside a callout
				activeCheck: ({ editor }) => {
					return editor.isActive("callout");
				},
			},
		],
	});
})();
