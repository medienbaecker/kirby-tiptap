import { Extension } from "@tiptap/core";
import type { AnyExtension } from "@tiptap/core";
import { tiptapContext } from "./tiptapExports";
import type { RegistryButton, RegistryShortcut, RegistryExtension } from "../types";

interface CompileResult {
	extensions: AnyExtension[];
	buttons: RegistryButton[];
}

export function compileRegistry(): CompileResult {
	const registry = window.kirbyTiptap?.registry;
	if (!registry) {
		return { extensions: [], buttons: [] };
	}

	const extensions: AnyExtension[] = [];
	const buttons: RegistryButton[] = [];
	const seenNames = new Set<string>();

	compileShortcuts(registry.shortcuts || [], extensions);
	compileExtensions(registry.extensions || [], extensions, buttons, seenNames);
	collectButtons(registry.buttons || [], buttons);

	return { extensions, buttons };
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
	seenNames: Set<string>,
): void {
	for (const entry of entries) {
		if (!entry.name) {
			console.warn("[kirby-tiptap] Skipping extension with no name:", entry);
			continue;
		}
		if (typeof entry.create !== "function") {
			console.warn(`[kirby-tiptap] Skipping extension "${entry.name}": create is not a function`);
			continue;
		}
		if (seenNames.has(entry.name)) {
			console.warn(`[kirby-tiptap] Skipping duplicate extension "${entry.name}"`);
			continue;
		}
		seenNames.add(entry.name);

		try {
			const ext = entry.create(tiptapContext);
			if (!ext || typeof ext !== 'object') {
				console.warn(`[kirby-tiptap] Extension "${entry.name}" create() returned invalid value`);
				continue;
			}
			extensions.push(ext);
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
