import { InvisibleCharacter } from "@tiptap-pro/extension-invisible-characters"

export class SoftHyphenCharacter extends InvisibleCharacter {
  constructor() {
    super({
      type: "soft-hyphen",
      predicate: (value) => value === "\u00AD",
    })
  }
}

export class NonBreakingSpaceCharacter extends InvisibleCharacter {
  constructor() {
    super({
      type: "non-breaking-space",
      predicate: (value) => value === "\u00A0", // Non-breaking space Unicode character
    })
  }
}
