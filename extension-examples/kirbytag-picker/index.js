/**
 * Example: KirbyTag picker with dynamic attribute fields
 *
 * Fetches KirbyTags that define a `dialog` key from a PHP API
 * endpoint and builds a dialog with tag-specific attribute fields
 * shown via `when` conditions. The tags in `pillTags` show as pills;
 * clicking one opens the same dialog to edit it. Note pills take the
 * theme and icon of their type.
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

	const noteTypes = {
		info: { theme: "info", icon: "info" },
		warning: { theme: "notice", icon: "alert" },
		error: { theme: "negative", icon: "cancel" },
	};

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
				options: schemas.map((schema) => ({ text: schema.label, value: schema.name })),
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

			for (const attribute of tag.attrs) {
				const { name, ...fieldProps } = attribute;
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

		for (const attribute of tag.attrs) {
			const value = values[tag.name + "_" + attribute.name];
			if (value) str += " " + attribute.name + ": " + value;
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

					const tag = tagSchemas.find((schema) => schema.name === tagName);
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
		create({ tiptap, extensions, kirbytags, components }) {
			const NoteView = {
				extends: components.KirbytagView,
				computed: {
					tag() {
						const tag = components.KirbytagView.computed.tag.call(this);
						const parsed = kirbytags.parse(this.node.attrs.text, this.extension.options.kirbytagAttributes);
						if (parsed._type !== "note") return tag;

						const { theme, icon } = noteTypes[parsed.type] ?? noteTypes.info;
						return { ...tag, props: { ...tag.props, theme, image: { icon } } };
					},
				},
			};

			return extensions.kirbytag.extend({
				addNodeView() {
					return tiptap.vue3.VueNodeViewRenderer(NoteView);
				},

				addOptions() {
					return { ...this.parent?.(), tags: pillTags };
				},

				addCommands() {
					const parent = this.parent?.();

					return {
						...parent,
						editKirbytag: () => (props) => {
							const { node } = props.state.selection;
							const parsed =
								node?.type.name === "kirbytag"
									? kirbytags.parse(node.attrs.text, this.options.kirbytagAttributes)
									: null;
							if (!parsed || !pillTags.includes(parsed._type)) return parent.editKirbytag()(props);

							loadTagSchemas().then((schemas) => {
								const tag = schemas?.find((schema) => schema.name === parsed._type);
								if (!tag) return;

								const value = { tag: tag.name, [tag.name + "_value"]: parsed.value };
								for (const attribute of tag.attrs) {
									value[tag.name + "_" + attribute.name] = parsed[attribute.name];
								}

								openPicker(value, "Save", (tagString) =>
									props.editor
										.chain()
										.focus()
										.command(({ tr }) => {
											if (tr.selection.node !== node) return false;
											tr.setNodeMarkup(tr.selection.from, undefined, { text: tagString });
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
