import { Extension } from "@tiptap/core";

export const NodeAttributes = Extension.create({
	name: "nodeAttributes",

	addOptions() {
		return {
			types: ["paragraph", "heading", "blockquote"], // Default supported node types
			customButtons: {}, // Will be populated from plugin options
		};
	},

	addGlobalAttributes() {
		// Group attributes by node type to minimize redundant attribute definitions
		const nodeTypeAttributes = new Map();

		Object.values(this.options.customButtons || {}).forEach((button) => {
			if (!button.attributes || !button.nodes) return;

			button.nodes.forEach((nodeType) => {
				if (!nodeTypeAttributes.has(nodeType)) {
					nodeTypeAttributes.set(nodeType, new Set());
				}
				Object.keys(button.attributes).forEach((attr) => {
					nodeTypeAttributes.get(nodeType).add(attr);
				});
			});
		});

		// Create optimized attribute definitions per node type
		const globalAttributes = [];

		nodeTypeAttributes.forEach((attributes, nodeType) => {
			const attributeDefinitions = {};

			attributes.forEach((attr) => {
				attributeDefinitions[attr] = {
					default: null,
					renderHTML: (attributes) => {
						if (!attributes[attr]) {
							return {};
						}
						// Ensure we have a valid string value
						const value = attributes[attr];
						if (typeof value !== 'string') {
							return {};
						}
						return {
							[attr]: value,
						};
					},
					parseHTML: (element) => {
						const value = element.getAttribute(attr);
						return value || null;
					},
				};
			});

			globalAttributes.push({
				types: [nodeType],
				attributes: attributeDefinitions,
			});
		});

		return globalAttributes;
	},

	addCommands() {
		// Cache for class parsing to avoid repeated string operations
		const classCache = new WeakMap();

		const parseClasses = (node) => {
			if (!node.attrs.class || typeof node.attrs.class !== "string")
				return new Set();

			if (classCache.has(node)) {
				const cached = classCache.get(node);
				if (cached.source === node.attrs.class) {
					return cached.classes;
				}
			}

			const classes = new Set(
				node.attrs.class.trim().split(/\s+/).filter(Boolean)
			);
			classCache.set(node, { source: node.attrs.class, classes });
			return classes;
		};

		return {
			toggleNodeAttributes:
				(nodeTypes, attributes) =>
				({ commands, state }) => {
					const { from, to } = state.selection;
					let hasAllAttributes = false;

					// Check if any node in selection has all the attributes
					state.doc.nodesBetween(from, to, (node, pos) => {
						if (nodeTypes.includes(node.type.name)) {
							const nodeHasAll = Object.entries(attributes).every(
								([key, value]) => {
									if (key === "class") {
										const classes = parseClasses(node);
										return typeof value === 'string' && classes.has(value);
									}
									return node.attrs[key] === value;
								}
							);
							if (nodeHasAll) {
								hasAllAttributes = true;
								return false; // Stop iteration early
							}
						}
					});

					// Toggle attributes on all matching nodes in selection
					return commands.command(({ tr, state }) => {
						let modified = false;

						state.doc.nodesBetween(from, to, (node, pos) => {
							if (nodeTypes.includes(node.type.name)) {
								const newAttrs = { ...node.attrs };

								if (hasAllAttributes) {
									// Remove attributes
									Object.keys(attributes).forEach((key) => {
										if (key === "class" && newAttrs.class) {
											const classes = parseClasses(node);
											const valueToRemove = attributes[key];
											if (typeof valueToRemove === 'string') {
												classes.delete(valueToRemove);
											}
											newAttrs.class =
												classes.size > 0 ? Array.from(classes).join(" ") : null;
										} else {
											newAttrs[key] = null;
										}
									});
								} else {
									// Add attributes
									Object.entries(attributes).forEach(([key, value]) => {
										if (key === "class") {
											const classes = parseClasses(node);
											// Ensure value is a string
											if (typeof value === 'string') {
												classes.add(value);
											}
											newAttrs.class = Array.from(classes).join(" ");
										} else {
											// Ensure value is a string or null
											newAttrs[key] = (typeof value === 'string') ? value : null;
										}
									});
								}

								tr.setNodeMarkup(pos, null, newAttrs);
								modified = true;
							}
						});

						return modified;
					});
				},

		};
	},
});
