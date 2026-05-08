import type { Panel } from "kirby-types";
import type { UploadsConfig, EndpointsConfig } from "../types";

export interface UploadedFile {
	dragText?: string;
	filename?: string;
	[key: string]: unknown;
}

interface UploadHandlers {
	done: (file: UploadedFile) => void;
	cancel: () => void;
	error?: (error: Error) => void;
}

export function buildUploadOptions(
	endpoints: EndpointsConfig,
	uploads: UploadsConfig,
	panel: Panel,
	handlers: UploadHandlers
) {
	const options: any = {
		url: `${panel.urls.api}/${endpoints.field}/upload`,
		multiple: false,
		on: {
			cancel: handlers.cancel,
			error: handlers.error,
			done: (files: unknown[]) => {
				if (files?.length) handlers.done(files[0] as UploadedFile);
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
