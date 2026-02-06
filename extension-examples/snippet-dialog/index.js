/**
 * Example: Snippet insert via Panel dialog
 *
 * Opens a Kirby Panel form dialog with a select field, letting the
 * user pick a snippet to insert into the editor. Demonstrates how to
 * use `window.panel.dialog.open()` from a standalone button.
 *
 * The snippets are hardcoded here for simplicity. In a real extension
 * you could pass them via blueprint props and read them from the
 * button's `context` argument.
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 *     - snippetDialog
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	// Map of snippet values to the HTML content that gets inserted.
	// Snippet markup must match the extensions enabled in your field's
	// button config — tiptap strips elements it doesn't have extensions for.
	const snippets = {
		lorem:
			"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>",
		section:
			"<h2>Section title</h2><p>Introductory paragraph for this section.</p><ul><li>First point</li><li>Second point</li><li>Third point</li></ul>",
		codeExample:
			'<p>The following example shows a basic API request:</p><pre><code>fetch("/api/endpoint")\n  .then(response => response.json())\n  .then(data => console.log(data));</code></pre>',
	};

	window.kirbyTiptap.registry.buttons.push({
		name: "snippetDialog",
		label: "Snippets",
		icon: "box",
		command: ({ editor }) => {
			window.panel.dialog.open({
				component: "k-form-dialog",
				props: {
					fields: {
						snippet: {
							type: "select",
							label: "Snippet",
							options: [
								{ text: "Lorem ipsum", value: "lorem" },
								{ text: "Section template", value: "section" },
								{ text: "Code example", value: "codeExample" },
							],
							required: true,
						},
					},
					submitButton: "Insert",
				},
				on: {
					submit: (values) => {
						const content = snippets[values.snippet];

						if (content) {
							editor.chain().focus().insertContent(content).run();
						}

						window.panel.dialog.close();
					},
				},
			});
		},
	});
})();
