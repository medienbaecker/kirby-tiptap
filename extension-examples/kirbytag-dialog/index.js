/**
 * Example: Pills with a dialog for custom KirbyTags
 *
 * The tags in `dialogTags` show as pills. Clicking one opens a dialog
 * with a text field for the value and one for each attribute the tag
 * registers in PHP. List custom tags with registered attributes, in
 * lowercase; link and file tags have their own dialogs.
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	const dialogTags = ["date", "gist"];

	function buildTagString(name, attributes, values) {
		let tag = "(" + name + ": " + (values.value ?? "");

		for (const attribute of attributes) {
			if (values[attribute]) tag += " " + attribute + ": " + values[attribute];
		}

		return tag + ")";
	}

	window.kirbyTiptap.registry.extensions.push({
		name: "kirbytag",
		create({ extensions, kirbytags }) {
			return extensions.kirbytag.extend({
				addOptions() {
					const parent = this.parent?.();
					return { ...parent, tags: [...(parent?.tags ?? []), ...dialogTags] };
				},

				addCommands() {
					const parent = this.parent?.();

					return {
						...parent,
						editKirbytag: () => (props) => {
							const { node } = props.state.selection;
							const attributeMap = this.options.kirbytagAttributes;
							const parsed =
								node?.type.name === "kirbytag" ? kirbytags.parse(node.attrs.text, attributeMap) : null;
							if (!parsed || !dialogTags.includes(parsed._type)) return parent.editKirbytag()(props);

							const name = parsed._type;
							const attributes = attributeMap?.[name] ?? [];
							const fields = { value: { type: "text", label: "Value", required: true } };
							const value = { value: parsed.value };

							for (const attribute of attributes) {
								fields[attribute] = { type: "text", label: attribute };
								value[attribute] = parsed[attribute];
							}

							window.panel.dialog.open({
								component: "k-form-dialog",
								props: { fields, value, submitButton: "Save" },
								on: {
									submit: (values) => {
										if (!values.value) return;

										props.editor
											.chain()
											.focus()
											.command(({ tr }) => {
												if (tr.selection.node !== node) return false;
												tr.setNodeMarkup(tr.selection.from, undefined, {
													text: buildTagString(name, attributes, values),
												});
												return true;
											})
											.run();
										window.panel.dialog.close();
									},
								},
							});

							return true;
						},
					};
				},
			});
		},
	});
})();
