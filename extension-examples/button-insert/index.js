/**
 * Example: Simple toolbar button
 *
 * Adds an "Insert Signature" button that inserts "— Username"
 * using the currently logged-in Panel user's name.
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 *     - signature
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	window.kirbyTiptap.registry.buttons.push({
		name: "signature",
		label: "Insert Signature",
		icon: "pen",
		command: ({ editor }) => {
			const name = window.panel?.user?.username || "Author";
			editor
				.chain()
				.focus()
				.insertContent("— " + name)
				.run();
		},
	});
})();
