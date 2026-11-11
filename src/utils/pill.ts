import { isFileTag, parseKirbyTag } from "./kirbyTags";
import { fileId, modelItem } from "./items";
import type { ItemEndpoint } from "./items";
import type { KirbytagsMap } from "../types";

const linkIcon = (type: string, href: string): string => {
	if (type === "email") return "email";
	if (type === "tel") return "phone";
	if (href.startsWith("page://")) return "page";
	if (href.startsWith("file://")) return "file";
	if (href.startsWith("#")) return "anchor";
	return "url";
};

const shortUrl = (text: string): string => {
	const url = /^https?:\/\//.test(text) ? URL.parse(text) : null;
	if (!url) return text;

	const host = url.hostname.replace(/^www\./, "");
	const segments = url.pathname.split("/").filter(Boolean);
	const last = segments[segments.length - 1];
	if (!last) return host;
	return segments.length === 1 ? `${host}/${last}` : `${host}/…/${last}`;
};

const webUrl = (value: string): string | undefined => (/^https?:\/\//.test(value) ? value : undefined);

const plain = (html: string): string => new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";

/**
 * The file or page a tag points to, as Kirby's items requests expect it
 */
export const target = (
	text: string,
	model: string,
	attributes?: KirbytagsMap
): { endpoint: ItemEndpoint; id: string } | null => {
	if (isFileTag(text)) {
		const { uuid: value = "" } = parseKirbyTag(text, attributes);
		const id = /^https?:\/\//.test(value) ? null : fileId(model, value);
		return id ? { endpoint: "items/files", id } : null;
	}

	const { href = "" } = parseKirbyTag(text, attributes);
	if (href.startsWith("page://")) return { endpoint: "items/pages", id: href };
	if (href.startsWith("file://")) return { endpoint: "items/files", id: href };
	return null;
};

/**
 * Pill props, the full text when the pill shortens it (for the title) and the link of a visual KirbyTag
 */
export const pill = (text: string, model: string, attributes?: KirbytagsMap) => {
	const type = text.match(/^\((\w+):/)![1].toLowerCase();
	const linked = target(text, model, attributes);
	const item = linked ? modelItem(linked.endpoint, linked.id) : undefined;
	const panelLink = item ? window.panel.url(item.link).toString() : undefined;
	let icon: string;
	let full: string;
	let link: string | undefined;

	if (isFileTag(text)) {
		const { uuid: value = "" } = parseKirbyTag(text, attributes);
		icon = linked ? "loader" : type;
		full = item?.filename ?? value;
		link = panelLink ?? webUrl(value);
	} else {
		const { href = "", text: label } = parseKirbyTag(text, attributes);
		icon = linkIcon(type, href);
		full = label || (item ? plain(item.text) : href);
		link = panelLink ?? { email: `mailto:${href}`, tel: `tel:${href}` }[type] ?? webUrl(href);
	}

	const props =
		item === undefined
			? { image: { icon } }
			: item
				? { image: { cover: true, ...item.image } }
				: { image: { icon: "alert", alt: window.panel.t("tiptap.kirbytag.missing") }, theme: "negative" };

	const shown = shortUrl(full);

	return {
		title: shown === full ? undefined : full,
		link,
		item,
		props: { ...props, text: shown },
	};
};
