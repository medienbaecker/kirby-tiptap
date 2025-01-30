# Kirby tiptap field (work in progress)

[Kirby](https://getkirby.com/) + [tiptap](https://tiptap.dev/) = ❤️

![Preview](https://github.com/user-attachments/assets/bc67ae1f-3705-49be-8425-f0c74393c160)

## Features

- [x] Simplified node/marks distinction
- [x] Easier configuration of headline levels (part of buttons)
- [x] Kirbytag highlighting
- [x] Custom highlights via config option
- [x] Invisible characters
  - [x] Soft hyphen
  - [x] Non-breaking space
  - [x] Always (barely) visible instead of button
- [x] Some improvements over Writer just because of tiptap's amazing groundwork
  - [x] Click outside reliably removes focus
  - [x] Arrow keys behavior (code block stops cursor movement in Writer, …)
- [ ] Better Link Dialog UX
  - [x] Merged email button with link (why have separate fields?)
  - [x] Contextual link dialog submit button label (insert/update)
  - [ ] "Title" and "Text" Fields?

## Necessary for 1.0

- [x] Regular field features
  - [x] Placeholder
  - [x] Counter
  - [x] Disabled
  - [x] Help
  - [x] size (?)
  - [x] spellcheck
  - [ ] Icon (?)
  - [ ] maxlength/minlength
- [ ] Replacement for writer blocks (?)

## Blockers

- [ ] Automatic conversion of permalinks ([First try](https://forum.getkirby.com/t/overwrite-tostring-method-for-custom-field/33053))
- [ ] Custom field method? Or extending `kirbytags`/`permalinksToUrls`?
- [ ] Different Link Dialogs in Textarea/Writer. See https://github.com/fabianmichael/kirby-markdown-field/issues/189#issuecomment-2072033717
- [ ] Textarea uses `headlines`, Writer uses `headings` button

## Future

- [ ] Settings for links
  - [ ] Uploads
  - [ ] Available link types
- [ ] "Remove formatting" button
- [ ] Kirbytag Button (fetch all Kirbytags)
- [ ] https://tiptap.dev/docs/examples/advanced/forced-content-structure
