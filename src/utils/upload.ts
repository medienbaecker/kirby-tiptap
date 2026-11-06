import type { Panel } from "kirby-types";
import type { UploadsConfig, EndpointsConfig } from "../types";
import { getFieldApiPath, processKirbyTagApi } from "./kirbyTags";

export interface UploadedFile {
	dragText?: string;
	filename?: string;
	[key: string]: unknown;
}

interface UploadHandlers {
	done: (tags: string[]) => void;
	cancel: () => void;
	error?: (error: Error) => void;
}

interface UploadOptions {
	url: string;
	multiple: boolean;
	on: {
		cancel: () => void;
		error?: (error: Error) => void;
		done: (files: unknown[]) => Promise<void>;
	};
	attributes?: { template?: string; parent?: string };
}

export function buildUploadOptions(
	endpoints: EndpointsConfig,
	uploads: UploadsConfig,
	panel: Panel,
	handlers: UploadHandlers
): UploadOptions {
	const options: UploadOptions = {
		url: `${panel.urls.api}/${getFieldApiPath(endpoints)}/upload`,
		multiple: true,
		on: {
			cancel: handlers.cancel,
			error: handlers.error,
			done: async (files: unknown[]) => {
				const dragTexts = (files as UploadedFile[]).map((file) => file.dragText).filter((text) => text !== undefined);
				handlers.done(await Promise.all(dragTexts.map((text) => processKirbyTagApi(text, endpoints, panel))));
			},
		},
	};

	if (uploads.template || uploads.parent) {
		options.attributes = {};
		if (uploads.template) options.attributes.template = uploads.template;
		if (uploads.parent) options.attributes.parent = uploads.parent;
	}

	return options;
}
