/**
 * Example: KirbyTag picker with dynamic attribute fields
 *
 * Fetches KirbyTags that define a `dialog` key from a PHP API
 * endpoint and builds a dialog with tag-specific attribute fields
 * shown via `when` conditions. The tags in `pillTags` show as pills;
 * clicking one opens the same dialog to edit it.
 *
 * Usage in blueprint:
 *   buttons:
 *     - bold
 *     - italic
 *     - kirbytagPicker
 */
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	const pillTags = ["note"];

	// Cache the tag schemas after first fetch
	let tagSchemas = null;

	async function loadTagSchemas() {
		if (!tagSchemas) {
			try {
				tagSchemas = await window.panel.api.get("kirbytag-picker/tags");
			} catch (error) {
				console.warn("[kirbytag-picker] Failed to fetch tags:", error);
			}
		}
		return tagSchemas;
	}

	function buildFields(schemas) {
		const fields = {
			tag: {
				type: "select",
				label: "KirbyTag",
				options: schemas.map((t) => ({ text: t.label, value: t.name })),
				required: true,
			},
		};

		for (const tag of schemas) {
			fields[tag.name + "_value"] = {
				type: "text",
				label: "Value",
				required: true,
				when: { tag: tag.name },
			};

			for (const attr of tag.attrs) {
				const { name, ...fieldProps } = attr;
				fields[tag.name + "_" + name] = {
					type: "text",
					when: { tag: tag.name },
					...fieldProps,
				};
			}
		}

		return fields;
	}

	function buildTagString(tag, values) {
		let str = "(" + tag.name + ": " + values[tag.name + "_value"];

		for (const attr of tag.attrs) {
			const val = values[tag.name + "_" + attr.name];
			if (val) str += " " + attr.name + ": " + val;
		}

		str += ")";
		return str;
	}

	function openPicker(value, submitButton, apply) {
		window.panel.dialog.open({
			component: "k-form-dialog",
			props: {
				fields: buildFields(tagSchemas),
				value: value,
				submitButton: submitButton,
			},
			on: {
				submit: (values) => {
					const tagName = values.tag;
					if (!tagName || !values[tagName + "_value"]) return;

					const tag = tagSchemas.find((t) => t.name === tagName);
					apply(buildTagString(tag, values));
					window.panel.dialog.close();
				},
			},
		});
	}

	window.kirbyTiptap.registry.buttons.push({
		name: "kirbytagPicker",
		label: "Insert KirbyTag",
		icon: "box",
		command: async ({ editor }) => {
			const schemas = await loadTagSchemas();
			if (!schemas) return;

			if (schemas.length === 0) {
				window.panel.dialog.open({
					component: "k-text-dialog",
					props: {
						text: "No KirbyTags with picker support found.",
						submitButton: false,
						cancelButton: "Close",
					},
				});
				return;
			}

			openPicker({ tag: schemas[0].name }, "Insert", (tagString) =>
				editor.chain().focus().insertContent(tagString).run()
			);
		},
	});

	window.kirbyTiptap.registry.extensions.push({
		name: "kirbytag",
		create({ extensions, kirbytags }) {
			return extensions.kirbytag.extend({
				addOptions() {
					return { ...this.parent?.(), tags: pillTags };
				},

				addCommands() {
					const parent = this.parent?.();

					return {
						...parent,
						editKirbytag: () => (props) => {
							const { node, from } = props.state.selection;
							const parsed = node?.type.name === "kirbytag" ? kirbytags.parse(node.attrs.text) : null;
							if (!parsed || !pillTags.includes(parsed._type)) return parent.editKirbytag()(props);

							loadTagSchemas().then((schemas) => {
								const tag = schemas?.find((t) => t.name === parsed._type);
								if (!tag) return;

								const value = { tag: tag.name, [tag.name + "_value"]: parsed.value };
								for (const attr of tag.attrs) {
									value[tag.name + "_" + attr.name] = parsed[attr.name];
								}

								openPicker(value, "Save", (tagString) =>
									props.editor
										.chain()
										.focus()
										.command(({ tr }) => {
											tr.setNodeMarkup(from, undefined, { text: tagString });
											return true;
										})
										.run()
								);
							});

							return true;
						},
					};
				},
			});
		},
	});
})();
