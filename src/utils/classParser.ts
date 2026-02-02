import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

interface ClassCache {
	source: string;
	classes: Set<string>;
}

// Shared cache for parsed classes across all usages
const classCache = new WeakMap<ProseMirrorNode, ClassCache>();

/**
 * Parses the class attribute from a ProseMirror node into a Set of class names.
 * Uses WeakMap caching to avoid repeated string parsing for the same node.
 */
export const parseNodeClasses = (node: ProseMirrorNode): Set<string> => {
	const nodeAttrs = node.attrs as Record<string, unknown>;
	if (!nodeAttrs.class || typeof nodeAttrs.class !== "string") {
		return new Set();
	}

	// Check cache
	if (classCache.has(node)) {
		const cached = classCache.get(node)!;
		if (cached.source === nodeAttrs.class) {
			return cached.classes;
		}
	}

	// Parse and cache
	const classes = new Set(
		(nodeAttrs.class as string).trim().split(/\s+/).filter(Boolean)
	);
	classCache.set(node, { source: nodeAttrs.class as string, classes });
	return classes;
};

