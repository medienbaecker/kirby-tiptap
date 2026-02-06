/**
 * Example: Advanced extension — Heading order checker
 *
 * Validates heading hierarchy (WCAG SC 1.3.1). Headings that skip
 * levels (e.g. h1 → h3 with no h2) get a visual warning decoration.
 * The toolbar button opens a dialog summarizing any issues.
 *
 * Demonstrates:
 *   - ProseMirror plugin with decorations via the factory pattern
 *   - Extension storage for tracking state
 *   - Panel dialog for showing results
 *
 * Usage in blueprint:
 *   buttons:
 *     - headings:
 *         - 1
 *         - 2
 *         - 3
 *     - headingOrder
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	function check(state, storage, Decoration, DecorationSet) {
		const decorations = [];
		const issues = [];
		let prevLevel = 0;

		state.doc.forEach((node, pos) => {
			if (node.type.name === "heading") {
				const level = node.attrs.level;
				if (level > prevLevel + 1) {
					issues.push({ level, expected: prevLevel + 1 });
					decorations.push(
						Decoration.node(pos, pos + node.nodeSize, {
							class: "heading-order-warning",
						})
					);
				}
				prevLevel = level;
			}
		});

		storage.issues = issues;
		return DecorationSet.create(state.doc, decorations);
	}

	window.kirbyTiptap.registry.extensions.push({
		name: "headingOrder",

		create({ tiptap, pm }) {
			const { Extension } = tiptap.core;
			const { Plugin, PluginKey } = pm.state;
			const { Decoration, DecorationSet } = pm.view;

			const key = new PluginKey("headingOrder");

			return Extension.create({
				name: "headingOrder",

				addStorage() {
					return { issues: [] };
				},

				addProseMirrorPlugins() {
					const storage = this.storage;

					return [
						new Plugin({
							key,
							state: {
								init(_, state) {
									return check(state, storage, Decoration, DecorationSet);
								},
								apply(tr, old, _, newState) {
									if (!tr.docChanged) return old;
									return check(newState, storage, Decoration, DecorationSet);
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

		buttons: () => [
			{
				name: "headingOrder",
				label: "Check Heading Order",
				icon: "sitemap",
				command: ({ editor }) => {
					const issues = editor.storage.headingOrder?.issues ?? [];

					if (issues.length === 0) {
						window.panel.dialog.open({
							component: "k-text-dialog",
							props: {
								text: "No heading order issues found.",
								submitButton: false,
								cancelButton: "Close",
							},
						});
						return;
					}

					const list = issues
						.map(
							(i) =>
								"<li>h" + i.level + " found, but h" + i.expected + " expected</li>"
						)
						.join("");

					window.panel.dialog.open({
						component: "k-text-dialog",
						props: {
							text:
								"<p><strong>" +
								issues.length +
								" heading " +
								(issues.length === 1 ? "issue" : "issues") +
								":</strong></p><ul>" +
								list +
								"</ul>",
							submitButton: false,
							cancelButton: "Close",
						},
					});
				},
			},
		],
	});
})();
