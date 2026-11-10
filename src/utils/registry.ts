import { Extension } from "@tiptap/core";
import type { AnyExtension } from "@tiptap/core";
import { tiptapContext } from "./tiptapExports";
import type { RegistryButton, RegistryShortcut, RegistryExtension, RegistryField } from "../types";

interface CompileResult {
	extensions: AnyExtension[];
	buttons: RegistryButton[];
}

export function compileRegistry(field?: RegistryField): CompileResult {
	const registry = window.kirbyTiptap?.registry;
	if (!registry) {
		return { extensions: [], buttons: [] };
	}

	const extensions: AnyExtension[] = [];
	const buttons: RegistryButton[] = [];

	compileShortcuts(registry.shortcuts || [], extensions);
	compileExtensions(registry.extensions || [], extensions, buttons, field);
	collectButtons(registry.buttons || [], buttons);

	return { extensions, buttons };
}

export function withRegistry(
	builtIns: AnyExtension[],
	registryExtensions: AnyExtension[],
	options: Record<string, Record<string, unknown>> = {},
): AnyExtension[] {
	const builtInNames = new Set(Object.values(tiptapContext.extensions).map((extension) => extension.name));

	return [
		...builtIns.map((extension) => {
			const replacement = registryExtensions.find((registered) => registered.name === extension.name);
			return replacement ? replacement.configure(extension.options) : extension;
		}),
		...registryExtensions.filter((registered) => !builtInNames.has(registered.name)),
	].map((extension) => (options[extension.name] ? extension.configure(options[extension.name]) : extension));
}

function compileShortcuts(
	shortcuts: RegistryShortcut[],
	extensions: AnyExtension[],
): void {
	const validShortcuts: RegistryShortcut[] = [];

	for (const shortcut of shortcuts) {
		if (!shortcut.name || !shortcut.keys?.length || typeof shortcut.command !== "function") {
			console.warn("[kirby-tiptap] Skipping invalid shortcut:", shortcut);
			continue;
		}
		validShortcuts.push(shortcut);
	}

	if (!validShortcuts.length) return;

	extensions.push(
		Extension.create({
			name: "registryShortcuts",

			addKeyboardShortcuts() {
				const bindings: Record<string, () => boolean> = {};
				const editor = this.editor;

				for (const shortcut of validShortcuts) {
					for (const key of shortcut.keys) {
						bindings[key] = () => {
							try {
								const result = shortcut.command({ editor });
								return result === true;
							} catch (error) {
								console.warn(`[kirby-tiptap] Shortcut "${shortcut.name}" failed:`, error);
								return false;
							}
						};
					}
				}

				return bindings;
			},
		}),
	);
}

function compileExtensions(
	entries: RegistryExtension[],
	extensions: AnyExtension[],
	buttons: RegistryButton[],
	field?: RegistryField,
): void {
	const available = { ...tiptapContext.extensions };

	for (const entry of entries) {
		if (!entry.name) {
			console.warn("[kirby-tiptap] Skipping extension with no name:", entry);
			continue;
		}
		if (typeof entry.create !== "function") {
			console.warn(`[kirby-tiptap] Skipping extension "${entry.name}": create is not a function`);
			continue;
		}
		try {
			const ext = entry.create({ ...tiptapContext, extensions: available, field });
			if (!ext || typeof ext !== 'object') {
				console.warn(`[kirby-tiptap] Extension "${entry.name}" create() returned invalid value`);
				continue;
			}
			const index = extensions.findIndex((registered) => registered.name === ext.name);
			if (index === -1) {
				extensions.push(ext);
			} else {
				extensions[index] = ext;
			}
			available[ext.name] = ext;
		} catch (error) {
			console.warn(`[kirby-tiptap] Extension "${entry.name}" factory failed:`, error);
			continue;
		}

		if (typeof entry.buttons === "function") {
			try {
				const extensionButtons = entry.buttons();
				if (Array.isArray(extensionButtons)) {
					collectButtons(extensionButtons, buttons);
				} else {
					console.warn(`[kirby-tiptap] Extension "${entry.name}" buttons() did not return an array`);
				}
			} catch (error) {
				console.warn(`[kirby-tiptap] Extension "${entry.name}" buttons() failed:`, error);
			}
		}
	}
}

function collectButtons(
	registryButtons: RegistryButton[],
	buttons: RegistryButton[],
): void {
	for (const button of registryButtons) {
		if (!button.name || typeof button.command !== "function") {
			console.warn("[kirby-tiptap] Skipping invalid button:", button);
			continue;
		}
		buttons.push(button);
	}
}
