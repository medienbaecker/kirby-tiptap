/**
 * Keyboard shortcuts for toolbar buttons.
 * These match Tiptap's built-in extension shortcuts.
 * Keys are command names (e.g., 'toggleBold' -> 'Mod-b')
 */
export const SHORTCUTS = {
	toggleBold: "Mod-b",
	toggleItalic: "Mod-i",
	toggleStrike: "Mod-Shift-s",
	toggleCode: "Mod-e",
	toggleBlockquote: "Mod-Shift-b",
	toggleCodeBlock: "Mod-Alt-c",
	toggleBulletList: "Mod-Shift-8",
	toggleOrderedList: "Mod-Shift-7",
};

/**
 * Get shortcut for a command
 */
export function getShortcut(command) {
	if (typeof command === "string") {
		return SHORTCUTS[command] || null;
	}
	return null;
}
