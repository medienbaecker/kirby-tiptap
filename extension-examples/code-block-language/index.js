/**
 * Code block with language selection.
 *
 * Replaces the built-in codeBlock with one that has a language attribute.
 * Uses the same "codeBlock" name so StarterKit's version is disabled.
 *
 * Frontend snippet renders <code class="language-xxx"> for Prism / Highlight.js.
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	var LANGUAGES = [
		{ value: null, label: "Plain" },
		{ value: "javascript", label: "JavaScript" },
		{ value: "php", label: "PHP" },
		{ value: "css", label: "CSS" },
		{ value: "html", label: "HTML" },
		{ value: "bash", label: "Bash" },
		{ value: "json", label: "JSON" },
		{ value: "yaml", label: "YAML" },
	];

	window.kirbyTiptap.registry.extensions.push({
		name: "codeBlock",

		create({ tiptap }) {
			var { Node, mergeAttributes } = tiptap.core;

			return Node.create({
				name: "codeBlock",
				group: "block",
				content: "text*",
				marks: "",
				code: true,
				defining: true,

				addAttributes() {
					return {
						language: {
							default: null,
							parseHTML: (el) => {
								var match = (el.querySelector("code")?.className || "").match(/language-(\w+)/);
								return match ? match[1] : null;
							},
						},
					};
				},

				parseHTML() {
					return [{ tag: "pre", preserveWhitespace: "full" }];
				},

				renderHTML({ node, HTMLAttributes }) {
					var lang = node.attrs.language;
					return [
						"pre",
						mergeAttributes(HTMLAttributes),
						["code", lang ? { class: "language-" + lang, "data-language": lang } : {}, 0],
					];
				},

				addCommands() {
					return {
						setCodeBlock: (attrs) => ({ commands }) => {
							return commands.setNode(this.name, attrs);
						},
						toggleCodeBlock: (attrs) => ({ commands }) => {
							return commands.toggleNode(this.name, "paragraph", attrs);
						},
					};
				},

				addKeyboardShortcuts() {
					return {
						"Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
						Tab: () => {
							if (!this.editor.isActive("codeBlock")) return false;
							this.editor.commands.insertContent("\t");
							return true;
						},
					};
				},
			});
		},

		buttons: () => [
			{
				name: "codeBlock",
				label: "Code Block",
				icon: "code-block",
				shortcut: "Mod-Alt-c",
				command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
				activeCheck: ({ editor }) => editor.isActive("codeBlock"),
				dropdown: ({ editor }) => {
					var items = LANGUAGES.map((lang) => ({
						label: lang.label,
						click: () => {
							if (editor.isActive("codeBlock")) {
								editor.chain().focus().updateAttributes("codeBlock", { language: lang.value }).run();
							} else {
								editor.chain().focus().setCodeBlock({ language: lang.value }).run();
							}
						},
					}));

					if (editor.isActive("codeBlock")) {
						items.unshift({
							label: "—",
							click: () => editor.chain().focus().toggleCodeBlock().run(),
						});
					}

					return items;
				},
			},
		],
	});
})();
