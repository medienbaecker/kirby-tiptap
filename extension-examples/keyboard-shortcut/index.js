/**
 * Example: Custom keyboard shortcut
 *
 * Registers Mod-Shift-H to insert a horizontal rule.
 * No Tiptap knowledge needed — just use editor.chain()...run().
 *
 * The shortcut works in all tiptap fields. No blueprint changes needed.
 * Return true from the command to indicate the shortcut was handled.
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	window.kirbyTiptap.registry.shortcuts.push({
		name: "insertHorizontalRule",
		keys: ["Mod-Shift-H"],
		command: ({ editor }) => {
			editor.chain().focus().setHorizontalRule().run();
			return true;
		},
	});
})();
