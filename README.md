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
    - bold
    - italic
    - strike
    - code
    - codeBlock
    - link
    - image
    - bulletList
    - orderedList
    - removeFormatting
    - "|"
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

### Configuration

```php
// site/config/config.php
return [

  // Supports https://getkirby.com/docs/reference/system/options/smartypants
  'smartypants' => true,

  // Custom highlights via regex (can be styled via panel CSS)
  'medienbaecker.tiptap.highlights' => [
    [
      'pattern' => '\\b[a-zA-ZäöüÄÖÜß\\w]{20,}\\b',
      'class' => 'long-word'
    ]
  ]

];
```

## Ideas for future improvements

- [ ] Localisation of formatting button titles
- [ ] Custom buttons
- [ ] Kirbytag button? (Fetch all Kirbytags except `link`, `image` and `file`?)
- [ ] Image/file uploads? (I don't necessarily like how the core textarea handles this with a `link` button allowing to select files and a separate file button with upload functionality)
- [ ] [Table button](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [ ] Replacement for Writer/Textarea blocks?
- [ ] Settings for links?
  - [ ] Link types?
  - [ ] Fields in dialog?
- [ ] [Snapshot Compare](https://tiptap.dev/blog/release-notes/introducing-snapshot-compare-for-tiptap)?
- [ ] [Blocks replacement](https://templates.tiptap.dev/)?
- [ ] [Forced content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure)?
- [ ] [Real-time collaboration](https://tiptap.dev/product/collaboration)?
