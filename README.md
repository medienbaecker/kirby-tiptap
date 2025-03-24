# Kirby Tiptap

A powerful, user-friendly [Tiptap](https://tiptap.dev) field for [Kirby](https://getkirby.com).

![Kirby Tiptap editor with formatting toolbar and example content demonstrating KirbyTags, special character visibility, and the tiptapText() method functionality.](https://github.com/user-attachments/assets/9588f26b-1304-49b2-89f5-cc45e4442935)

## Features

- 🌏 **Best of both worlds:** Uses (and highlights) [KirbyTags](https://getkirby.com/docs/reference/plugins/extensions/kirbytags) for images/links while providing WYSIWYG formatting
- 📦 **Supports all standard Kirby field features** like `required`, `default`, `placeholder`, `counter`, `disabled`, `help`, `size`, `spellcheck` and `minlength`/`maxlength`
- 🤓 **Smart text handling** with intuitive soft hyphen `(-)` and non-breaking space `(_)` replacements, and visible special characters
- 🔧 **Configurable buttons** with customizable heading levels and a content sanitizer that automatically removes formatting you don't want
- 🛼 **Inline mode** for paragraph-free content with buttons being disabled automatically
- 🧠 **One method to rule them all** with `tiptapText()` handling [UUID resolution](https://getkirby.com/docs/reference/templates/field-methods/permalinks-to-urls), [smartypants](https://getkirby.com/docs/reference/system/options/smartypants), automatic [inline mode](https://getkirby.com/docs/reference/templates/helpers/kirbytextinline) and more
- ✨ **Intuitive drag & drop support** for pages and files with intelligent spacing
- 👀 **Custom field preview** showing formatted text in structure fields
- 🔗 **Improved link handling** with a dialog that automatically picks the right KirbyTag (`(link: )`, `(email: )`, `(file: )`or `(tel: )`) and a paste handler that adds link tags to the selected text
- 🌈 **Custom highlights** via a regular expression config option, making it possible to e.g. highlight long words
- 📋 **Abstracted JSON structure** for easy content manipulation with features like `offsetHeadings`

## Usage

### Blueprints

#### Available buttons

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
    - strike
    - code
    - codeBlock
    - "|"
    - link
    - image
    - "|"
    - bulletList
    - orderedList
```

#### Available options

```yml
tiptap:
  inline: true # remove block elements like paragraphs
  counter: false # disable character counter
  size: small # small, medium, large, huge or the default auto
  spellcheck: false # disable spellcheck
  pretty: true # pretty-print JSON in content file
  required: true
  placeholder: My placeholder
  default: My default content
  disabled: true
  help: My help
  maxlength: 10
  minlength: 10
```

### Template

```php
// Basic usage
echo $page->text()->tiptapText();

// With heading level offset
echo $page->text()->tiptapText([
  'offsetHeadings' => 1
]);
```

## Roadmap

### Coming soon

- [ ] Image uploads
- [ ] Custom buttons

### Under consideration

- [ ] Kirbytag button (fetch all Kirbytags except `link`, `image` and `file`?)
- [ ] [Table button](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [ ] Replacement for Writer blocks (?)
- [ ] Attachement/file button (with uploads)
- [ ] Settings for links
  - [ ] Upload location
  - [ ] Link types
  - [ ] Fields in dialog
- [ ] "Remove formatting" button (?)
- [ ] [Snapshot Compare](https://tiptap.dev/blog/release-notes/introducing-snapshot-compare-for-tiptap)
- [ ] [Blocks replacement](https://templates.tiptap.dev/)
- [ ] [Forced content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure)
- [ ] [Real-time collaboration](https://tiptap.dev/product/collaboration)

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
9. [Losing content](https://github.com/getkirby/kirby/issues/6507)
