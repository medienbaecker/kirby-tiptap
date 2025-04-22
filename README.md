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
- 🔗 **Improved link handling** with a dialog that allows custom link types and custom fields, automatically picks the right KirbyTag (`(link: )`, `(email: )`, `(file: )`or `(tel: )`) and pre-fills the link and link text fields according to the selected text
- 🌈 **Custom highlights** via a regular expression config option, making it possible to e.g. highlight long words
- 🔧 **Allows HTML code** so you can paste your ⁠favourite `<script>`, `⁠<marquee>`, or ⁠`<blink>` tag
- 📋 **Abstracted JSON structure** for easy content manipulation with features like `offsetHeadings`

## Usage

### Blueprints

#### Available buttons

```yml
tiptap:
  buttons:
    # Default buttons:
    - headings:
        - 1
        - 2
        - 3
    - bold
    - italic
    - link
    - image
    - bulletList
    - orderedList
    # Additional buttons:
    - strike
    - code
    - codeBlock
    - removeFormatting
    # Divider:
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
  links:
    # Set link types in the link dialog
    options:
      - page
      - url
    # Add fields to the link dialog
    fields:
      class:
        label: Classes
        type: checkboxes
        options:
          border: Border
          shadow: Shadow
          rounded: Rounded
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
      'class' => 'long-word',
      'title' => 'Long word (20+ characters)'
    ]
  ]

];
```

## Ideas for future improvements

- [ ] Localisation of formatting button titles
- [ ] Custom buttons
- [ ] Option to prevent HTML code (e.g. `<script>`)
- [ ] Kirbytag button? (Fetch all Kirbytags except `link`, `image` and `file`?)
- [ ] Image/file uploads? (I don't necessarily like how the core textarea handles this with a `link` button allowing to select files and a separate file button with upload functionality)
- [ ] [Table button](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [ ] Replacement for Writer/Textarea blocks?
- [ ] [Snapshot Compare](https://tiptap.dev/blog/release-notes/introducing-snapshot-compare-for-tiptap)?
- [ ] [Blocks replacement](https://templates.tiptap.dev/)?
- [ ] [Forced content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure)?
- [ ] [Real-time collaboration](https://tiptap.dev/product/collaboration)?
