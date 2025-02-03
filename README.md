# Kirby tiptap field (work in progress)

[Kirby](https://getkirby.com/) + [tiptap](https://tiptap.dev/) = ❤️

This field is somewhere between the [Writer](https://getkirby.com/docs/reference/panel/fields/writer) and [Textarea](https://getkirby.com/docs/reference/panel/fields/textarea) fields. It uses [KirbyTags](https://getkirby.com/docs/reference/#kirbytags) for stuff like images and links while showing formatting in a WYSIWYG style for other things.

![Preview](https://github.com/user-attachments/assets/bc67ae1f-3705-49be-8425-f0c74393c160)

## Motivation

Put simply, I'm not happy with any of the existing options.

### [Textarea field](https://getkirby.com/docs/reference/panel/fields/textarea)

Being a purist myself, this has long been my favorite. This delightfully simple field comes with quite a few drawbacks, though. Among others:

1. Pressing formatting buttons only inserts characters. This can lead to `My # heading` or `My - list`.
2. No undo functionality for formatting
3. No configurable headlines
4. No syntax highlighting, making it hard for my clients to understand.
5. Links don't insert `(email: )`, `(file: )`, `(tel: )` tags, only `(link: )`

### [Writer field](https://getkirby.com/docs/reference/panel/fields/writer)

The Writer field is what Kirby uses for the default [text blocks](https://getkirby.com/docs/reference/panel/fields/blocks). That's where it shines but in my experience it's not a replacement for a standalone content field.

1. Experimental [permalinksToUrls()](https://getkirby.com/docs/reference/templates/field-methods/permalinks-to-urls) method pretty much unavoidable
2. No `size` option
3. No HTML allowed
4. No highlighting for KirbyTags
5. Not possible to add images/videos/…
6. Complex nodes/marks differentiation, UX for lists
7. Redundant email button
8. Massive issues with copying text containing [gender stars](https://en.wikipedia.org/wiki/Gender_star) (https://github.com/getkirby/kirby/issues/3138)

### [Markdown field plugin](https://github.com/fabianmichael/kirby-markdown-field/)

Huge codebase that I don't understand. Trust me, I've tried.

## Example blueprint

```yml
tiptap:
  buttons:
    - headings:
        - 1
        - 2
        - 3
    - "|"
    - bold
    - italic
    - code
    - strike
    - "|"
    - "link"
    - "|"
    - "bulletList"
    - "orderedList"
```

## Features

- [x] Simplified node/marks distinction
- [x] Configuration of headline levels
- [x] Kirbytag highlighting
- [x] Custom highlights via config option
- [x] Invisible characters
  - [x] Soft hyphen
  - [x] Non-breaking space
  - [x] Always (barely) visible instead of button
- [x] Text replacement for `(-)` with soft hyphen
- [x] Some improvements over Writer just because of tiptap's amazing groundwork
  - [x] Click outside reliably removes focus
  - [x] More reliable arrow keys behavior
- [x] Drag files/pages with nice [dropcursor](https://tiptap.dev/docs/editor/extensions/functionality/dropcursor) UI
- [x] Allows HTML like the textarea
- [x] Better Link Dialog UX
  - [x] Merged email button with link (why have separate fields?)
  - [x] Automatic KirbyTag handling (`link`, `email`, `tel`)

## Necessary for 1.0

- [x] Regular field features
  - [x] Required
  - [x] Placeholder
  - [x] Counter
  - [x] Disabled
  - [x] Help
  - [x] size
  - [x] spellcheck
  - [ ] maxlength/minlength
    - [x] Counter
    - [ ] Validation (help)
  - [x] Allow only visible buttons' formatting
    - [ ] Handle content that contains disabled marks
- [x] Reverting changes
- [x] Handle permalinks/UUIDs
- [x] File/image button
- [x] Drag files/pages into editor

## Planned

- [ ] [Codeblocks](https://tiptap.dev/docs/editor/extensions/nodes/code-block)
- [ ] File uploads
- [ ] Custom buttons

## Blockers

- [ ] Different Link Dialogs in Textarea/Writer. See https://github.com/fabianmichael/kirby-markdown-field/issues/189#issuecomment-2072033717
- [ ] Textarea uses `headlines`, Writer uses `headings` button

## Future

- [ ] Kirbytag button (fetch all Kirbytags except `link`, `image` and `file`?)
- [ ] [Table button](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [ ]
- [ ] Replacement for Writer blocks (?)
- [ ] Settings for links
  - [ ] Uploads
  - [ ] Link types
  - [ ] Fields in dialog
- [ ] "Remove formatting" button (?)
- [ ] [Snapshot Compare](https://tiptap.dev/blog/release-notes/introducing-snapshot-compare-for-tiptap)
- [ ] [Blocks replacement](https://templates.tiptap.dev/)
- [ ] [Forced content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure)
- [ ] [Real-time collaboration](https://tiptap.dev/product/collaboration)
