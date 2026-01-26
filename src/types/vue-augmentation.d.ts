import type { Panel, PanelHelpers, PanelApi } from "kirby-types";

declare module "vue" {
	interface ComponentCustomProperties {
		$panel: Panel;
		$helper: PanelHelpers;
		$api: PanelApi;
		$t: (key: string, ...args: unknown[]) => string;
	}
}
