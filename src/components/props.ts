import type { PropType } from "vue";
import type {
	ButtonItem,
	LinksConfig,
	FilesConfig,
	EndpointsConfig,
	UploadsConfig,
	UuidConfig,
	KirbytagsMap,
} from "../types";
import type { ModelItem } from "../utils/items";

export const props = {
	name: String,
	label: String,
	value: String,
	pretty: Boolean,
	placeholder: String,
	disabled: Boolean,
	required: Boolean,
	spellcheck: Boolean,
	help: String,
	minlength: Number,
	maxlength: Number,
	size: String,
	buttons: Array as PropType<ButtonItem[]>,
	inline: Boolean,
	kirbytags: Boolean,
	format: String as PropType<'json' | 'markdown'>,
	kirbytagAttributes: Object as PropType<KirbytagsMap>,
	kirbytagItems: Object as PropType<Record<string, ModelItem>>,
	links: Object as PropType<LinksConfig>,
	files: Object as PropType<FilesConfig>,
	endpoints: Object as PropType<EndpointsConfig>,
	uploads: [Object, Boolean] as PropType<UploadsConfig | false>,
	uuid: Object as PropType<UuidConfig>,
};
