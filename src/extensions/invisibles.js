import { InvisibleCharacter } from "@tiptap-pro/extension-invisible-characters";

/**
 * Custom invisible character type for soft hyphens
 */
export class SoftHyphenCharacter extends InvisibleCharacter {
	constructor() {
		super({
			type: "soft-hyphen",
			predicate: (value) => value === "\u00AD", // Unicode soft hyphen
		});
	}
}

/**
 * Custom invisible character type for non-breaking spaces
 */
export class NonBreakingSpaceCharacter extends InvisibleCharacter {
	constructor() {
		super({
			type: "non-breaking-space",
			predicate: (value) => value === "\u00A0", // Unicode non-breaking space
		});
	}
}
