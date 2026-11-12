/**
 * Example: Table of contents
 *
 * A button toggles a sidebar that lists the field's headings.
 * Click a heading to jump to it.
 *
 * Usage in blueprint:
 *   buttons:
 *     - tableOfContents
 */
(function () {
	window.kirbyTiptap ??= {};
	window.kirbyTiptap.registry ??= { extensions: [], buttons: [], shortcuts: [] };

	let key;

	function findHeadings(doc) {
		const headings = [];

		doc.descendants((node, position) => {
			if (node.type.name !== "heading") return;
			if (node.textContent) headings.push({ node, position });
			return false;
		});

		return headings;
	}

	function createView(editor, view) {
		const nav = document.createElement("nav");
		nav.className = "table-of-contents";
		nav.ariaLabel = "Table of contents";

		let headings = [];
		let current = -1;

		function render() {
			const topLevel = Math.min(...headings.map((heading) => heading.node.attrs.level));

			nav.replaceChildren(
				...headings.map((heading) => {
					const button = document.createElement("button");
					button.type = "button";
					button.style.setProperty("--depth", heading.node.attrs.level - topLevel);
					button.textContent = heading.node.textContent;
					button.addEventListener("click", () => jump(heading));
					return button;
				})
			);
			nav.children[current]?.setAttribute("aria-current", "true");
		}

		function markCurrent() {
			if (nav.hidden) return;

			const elements = headings.map(({ position }) => view.nodeDOM(position));
			const line = parseFloat(getComputedStyle(elements[0]).scrollMarginTop) + 1;
			const index = elements.findLastIndex((element) => element.getBoundingClientRect().top <= line);

			if (index === current) return;

			nav.children[current]?.removeAttribute("aria-current");
			current = index;

			const button = nav.children[current];
			if (button) {
				button.setAttribute("aria-current", "true");
				nav.scrollTop = button.offsetTop - nav.clientHeight / 2;
			}
		}

		function jump(heading) {
			editor.commands.focus(heading.position + heading.node.nodeSize - 1, { scrollIntoView: false });
			view.nodeDOM(heading.position).scrollIntoView({ block: "start" });
		}

		function scroll(event) {
			if (event.target !== nav) markCurrent();
		}

		nav.addEventListener("mousedown", (event) => event.preventDefault());
		document.addEventListener("scroll", scroll, { capture: true, passive: true });
		view.dom.before(nav);

		const pluginView = {
			update(view, previousState) {
				if (!previousState?.doc.eq(view.state.doc)) {
					headings = findHeadings(view.state.doc);
					render();
				}

				nav.hidden = !key.getState(view.state) || headings.length === 0;
				markCurrent();
			},

			destroy() {
				document.removeEventListener("scroll", scroll, { capture: true });
				nav.remove();
			},
		};

		pluginView.update(view);

		return pluginView;
	}

	window.kirbyTiptap.registry.extensions.push({
		name: "tableOfContents",

		create({ tiptap, pm }) {
			key ??= new pm.state.PluginKey("tableOfContents");

			return tiptap.core.Extension.create({
				name: "tableOfContents",

				addProseMirrorPlugins() {
					return [
						new pm.state.Plugin({
							key,
							state: {
								init: () => false,
								apply: (transaction, visible) => (transaction.getMeta(key) ? !visible : visible),
							},
							view: (view) => createView(this.editor, view),
						}),
					];
				},
			});
		},

		buttons: () => [
			{
				name: "tableOfContents",
				label: "Table of contents",
				icon: "layout-right",
				activeCheck: ({ editor }) => key.getState(editor.state),
				command: ({ editor }) => editor.view.dispatch(editor.state.tr.setMeta(key, true)),
			},
		],
	});
})();
