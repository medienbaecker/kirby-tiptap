import { reactive } from "vue";

export interface ModelItem {
	filename?: string;
	text: string;
	image: Record<string, unknown>;
}

const items = reactive(new Map<string, ModelItem | null>());
const requested = new Set<string>();
let timestamp: number | null = null;

const resetOnNewView = () => {
	if (timestamp === window.panel.view.timestamp) return;
	timestamp = window.panel.view.timestamp;
	items.clear();
	requested.clear();
};

/**
 * The ID Kirby's items/files request resolves for a file reference in a tag;
 * filenames are relative to the page (or site) the field belongs to
 */
export const fileId = (model: string, value: string): string | null => {
	if (value.startsWith("file://") || value.includes("/")) return value;
	if (!/^\/(pages\/|site)/.test(model)) return null;
	const parent = model.replace(/\/files\/[^/]+$/, "").replace(/^\/(pages\/|site)/, "").replace(/\+/g, "/");
	return parent ? `${parent}/${value}` : value;
};

export type ItemEndpoint = "items/files" | "items/pages";

/**
 * The Panel item of a file or page, from Kirby's items requests, cached by what it is
 * (not by the tag text, so editing a tag's attributes keeps its thumbnail).
 * Undefined while loading, null when it is missing or not listable.
 */
export const modelItem = (endpoint: ItemEndpoint, id: string): ModelItem | null | undefined => {
	resetOnNewView();
	const key = `${endpoint}:${id}`;

	if (!requested.has(key)) {
		requested.add(key);
		window.panel.app.config.globalProperties.$helper
			.items(endpoint, id)
			.then((item) => items.set(key, (item as ModelItem | undefined) ?? null));
	}

	return items.get(key);
};

export const seedModelItem = (endpoint: ItemEndpoint, id: string, item: ModelItem): void => {
	resetOnNewView();
	items.set(`${endpoint}:${id}`, item);
	requested.add(`${endpoint}:${id}`);
};
