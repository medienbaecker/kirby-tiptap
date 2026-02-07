/**
 * Example: KirbyTag picker with dynamic attribute fields
 *
 * Fetches KirbyTags that define a `dialog` key from a PHP API
 * endpoint and builds a dialog with tag-specific attribute fields
 * shown via `when` conditions.
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

	// Cache the tag schemas after first fetch
	let tagSchemas = null;

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

	window.kirbyTiptap.registry.buttons.push({
		name: "kirbytagPicker",
		label: "Insert KirbyTag",
		icon: "box",
		command: async ({ editor }) => {
			if (!tagSchemas) {
				try {
					tagSchemas = await window.panel.api.get("kirbytag-picker/tags");
				} catch (error) {
					console.warn("[kirbytag-picker] Failed to fetch tags:", error);
					return;
				}
			}

			if (tagSchemas.length === 0) {
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

			const fields = buildFields(tagSchemas);

			window.panel.dialog.open({
				component: "k-form-dialog",
				props: {
					fields: fields,
					value: { tag: tagSchemas[0].name },
					submitButton: "Insert",
				},
				on: {
					submit: (values) => {
						const tagName = values.tag;
						if (!tagName || !values[tagName + "_value"]) return;

						const tag = tagSchemas.find((t) => t.name === tagName);
						const str = buildTagString(tag, values);
						editor.chain().focus().insertContent(str).run();
						window.panel.dialog.close();
					},
				},
			});
		},
	});
})();
