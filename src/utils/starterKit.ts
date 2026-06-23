import StarterKit from "@tiptap/starter-kit";

function deriveStarterKitExtensionNames(): Set<string> {
	const addExtensions = (
		StarterKit.configure({}) as unknown as {
			config?: { addExtensions?: () => { name: string }[] };
		}
	).config?.addExtensions;

	if (typeof addExtensions !== "function") {
		return new Set();
	}

	const children = addExtensions.call({ options: {}, name: "starterKit" });
	return new Set(children.map((ext) => ext.name));
}

export const STARTER_KIT_EXTENSION_NAMES = deriveStarterKitExtensionNames();

export function starterKitOverrides(
	base: Record<string, unknown>,
	registryExtensions: { name?: string }[]
): Record<string, unknown> {
	const config = { ...base };
	for (const ext of registryExtensions) {
		if (ext.name && STARTER_KIT_EXTENSION_NAMES.has(ext.name)) {
			config[ext.name] = false;
		}
	}
	return config;
}
