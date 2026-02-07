/**
 * Example: Two-column layout
 *
 * Adds a block-level two-column container. Each column accepts
 * any block content (paragraphs, lists, headings, etc.).
 *
 * Demonstrates:
 *   - Multiple nodes bundled via addExtensions()
 *   - Custom commands with position math (setColumns, unsetColumns, toggleColumns)
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 *     - twoColumns
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	window.kirbyTiptap.registry.extensions.push({
		name: "twoColumns",

		create({ tiptap }) {
			const { Node, Extension, mergeAttributes } = tiptap.core;

			const Column = Node.create({
				name: "column",
				group: "columns",
				content: "block+",
				defining: true,

				parseHTML() {
					return [{ tag: "div[data-column]" }];
				},

				renderHTML({ HTMLAttributes }) {
					return ["div", mergeAttributes(HTMLAttributes, { "data-column": "" }), 0];
				},
			});

			const Columns = Node.create({
				name: "columns",
				group: "block",
				content: "column column",
				defining: true,

				parseHTML() {
					return [{ tag: "div[data-columns]" }];
				},

				renderHTML({ HTMLAttributes }) {
					return ["div", mergeAttributes(HTMLAttributes, { "data-columns": "" }), 0];
				},

				addCommands() {
					return {
						setColumns:
							() =>
							({ state, tr, dispatch }) => {
								const { $from, $to } = state.selection;
								const { columns, column, paragraph } = state.schema.nodes;

								const startBlock = $from.node(1);
								const startPos = $from.before(1);
								const endBlock = $to.node(1);

								// Two+ blocks selected → first two become columns
								if (startBlock !== endBlock) {
									const $second = tr.doc.resolve($from.after(1) + 1);
									const secondBlock = $second.node(1);
									const secondEnd = $second.after(1);

									const node = columns.create(null, [
										column.create(null, [startBlock]),
										column.create(null, [secondBlock]),
									]);

									if (dispatch) {
										tr.replaceWith(startPos, secondEnd, node);
										tr.setSelection(
											state.selection.constructor.near(
												tr.doc.resolve(startPos + 2),
											),
										);
										dispatch(tr);
									}
									return true;
								}

								// Single block → becomes column 1, column 2 is empty
								const node = columns.create(null, [
									column.create(null, [startBlock]),
									column.create(null, [paragraph.create()]),
								]);

								if (dispatch) {
									tr.replaceWith(startPos, $from.after(1), node);
									tr.setSelection(
										state.selection.constructor.near(
											tr.doc.resolve(startPos + 2),
										),
									);
									dispatch(tr);
								}
								return true;
							},

						unsetColumns:
							() =>
							({ state, tr, dispatch }) => {
								const { $from } = state.selection;

								for (let d = $from.depth; d > 0; d--) {
									if ($from.node(d).type.name === "columns") {
										if (dispatch) {
											const blocks = [];
											$from.node(d).forEach((col) => {
												col.forEach((block) => blocks.push(block));
											});
											tr.replaceWith($from.before(d), $from.after(d), blocks);
											dispatch(tr);
										}
										return true;
									}
								}

								return false;
							},

						toggleColumns:
							() =>
							({ commands }) => {
								if (commands.unsetColumns()) return true;
								return commands.setColumns();
							},
					};
				},
			});

			return Extension.create({
				name: "twoColumns",
				addExtensions() {
					return [Column, Columns];
				},
			});
		},

		buttons: () => [
			{
				name: "twoColumns",
				label: "Two Columns",
				icon: "columns",
				command: ({ editor }) => {
					editor.chain().focus().toggleColumns().run();
				},
				activeCheck: ({ editor }) => {
					return editor.isActive("columns");
				},
			},
		],
	});
})();
