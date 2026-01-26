import { Extension, type GlobalAttributes, type Attribute } from "@tiptap/core";
import type { CustomButtonConfig } from "../types";
import { parseNodeClasses } from "../utils/classParser";

interface NodeAttributesOptions {
	types: string[];
	customButtons: Record<string, CustomButtonConfig>;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		nodeAttributes: {
			toggleNodeAttributes: (
				nodeTypes: string[],
				attributes: Record<string, string | null>
			) => ReturnType;
		};
	}
}

export const NodeAttributes = Extension.create<NodeAttributesOptions>({
	name: "nodeAttributes",

	addOptions() {
		return {
			types: ["paragraph", "heading", "blockquote"], // Default supported node types
			customButtons: {}, // Will be populated from plugin options
		};
	},

	addGlobalAttributes(): GlobalAttributes {
		// Group attributes by node type to minimize redundant attribute definitions
		const nodeTypeAttributes = new Map<string, Set<string>>();

		Object.values(this.options.customButtons || {}).forEach((button) => {
			if (!button.attributes || !button.nodes) return;

			button.nodes.forEach((nodeType) => {
				if (!nodeTypeAttributes.has(nodeType)) {
					nodeTypeAttributes.set(nodeType, new Set());
				}
				Object.keys(button.attributes!).forEach((attr) => {
					nodeTypeAttributes.get(nodeType)!.add(attr);
				});
			});
		});

		// Create optimized attribute definitions per node type
		const globalAttributes: GlobalAttributes = [];

		nodeTypeAttributes.forEach((attributes, nodeType) => {
			const attributeDefinitions: Record<string, Partial<Attribute>> = {};

			attributes.forEach((attr) => {
				attributeDefinitions[attr] = {
					default: null,
					validate: (value: unknown) => value === null || typeof value === 'string',
					renderHTML: (attrs: Record<string, unknown>) => {
						const value = attrs[attr];
						if (typeof value !== 'string') return {};
						return { [attr]: value };
					},
					parseHTML: (element: HTMLElement) => element.getAttribute(attr) || null,
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
		return {
			toggleNodeAttributes:
				(nodeTypes: string[], attributes: Record<string, string | null>) =>
				({ commands, state }) => {
					const { from, to } = state.selection;
					let hasAllAttributes = false;

					// Check if any node in selection has all the attributes
					state.doc.nodesBetween(from, to, (node) => {
						if (nodeTypes.includes(node.type.name)) {
							const nodeHasAll = Object.entries(attributes).every(
								([key, value]) => {
									if (key === "class") {
										const classes = parseNodeClasses(node);
										return typeof value === 'string' && classes.has(value);
									}
									return (node.attrs as Record<string, unknown>)[key] === value;
								}
							);
							if (nodeHasAll) {
								hasAllAttributes = true;
								return false; // Stop iteration early
							}
						}
					});

					// Toggle attributes on all matching nodes in selection
					return commands.command(({ tr, state: cmdState }) => {
						let modified = false;

						cmdState.doc.nodesBetween(from, to, (node, pos) => {
							if (nodeTypes.includes(node.type.name)) {
								const newAttrs = { ...node.attrs } as Record<string, unknown>;

								if (hasAllAttributes) {
									// Remove attributes
									Object.keys(attributes).forEach((key) => {
										if (key === "class" && newAttrs.class) {
											const classes = parseNodeClasses(node);
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
											const classes = parseNodeClasses(node);
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
