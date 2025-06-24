# Kirby Tiptap (WIP)

A powerful, user-friendly [Tiptap](https://tiptap.dev) field for [Kirby](https://getkirby.com).

![Kirby Tiptap editor with formatting toolbar and example content demonstrating KirbyTags, special character visibility, and the tiptapText() method functionality.](https://github.com/user-attachments/assets/9588f26b-1304-49b2-89f5-cc45e4442935)

## Features

- 🌏 **Best of both worlds:** Uses (and highlights) [KirbyTags](https://getkirby.com/docs/reference/plugins/extensions/kirbytags) for images/links while providing WYSIWYG formatting
- 📦 **Supports all standard Kirby field features** like `required`, `default`, `placeholder`, `counter`, `disabled`, `help`, `size`, `spellcheck` and `minlength`/`maxlength`
- 🤓 **Smart text handling** with intuitive soft hyphen `(-)` and non-breaking space `(_)` replacements, and visible special characters
- 🔧 **Configurable buttons** with customizable heading levels and custom buttons that can add any attributes to nodes
- 🛼 **Inline mode** for paragraph-free content with buttons being disabled automatically
- 🧠 **One method to rule them all** with `tiptapText()` handling [UUID resolution](https://getkirby.com/docs/reference/templates/field-methods/permalinks-to-urls), [smartypants](https://getkirby.com/docs/reference/system/options/smartypants), automatic [inline mode](https://getkirby.com/docs/reference/templates/helpers/kirbytextinline) and more
- ✨ **Intuitive drag & drop support** for pages and files with intelligent spacing
- 👀 **Custom field preview** showing formatted text in structure/object fields
- 🔗 **Improved link and file handling** with dialogs that allow custom fields, automatically pick the right KirbyTag (`(link: )`, `(email: )`, `(file: )` or `(tel: )`) and allow editing existing links/files by pre-filling dialogs
- 🌈 **Custom highlights** via a regular expression config option, making it possible to e.g. highlight long words
- 🔧 **Optional setting to allow HTML code** so you can paste your ⁠favourite `<script>`, `⁠<marquee>`, or ⁠`<blink>` tag directly
- 📋 **Abstracted JSON structure** for easy content manipulation with features like `offsetHeadings`

## Installation

### Composer

```
composer require medienbaecker/kirby-tiptap
```

### Manual

1. Download or clone this repository
2. Place the folder in your `⁠site/plugins` directory

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
    - file
    - bulletList
    - orderedList
    # Additional buttons:
    - strike
    - code
    - codeBlock
    - blockquote
    - horizontalRule
    - removeFormatting
    # Divider: (as many as you want)
    - "|"
```

#### Available options

```yml
fields:
  text:
    type: tiptap
    inline: true # remove block elements like paragraphs
    counter: false # disable character counter
    size: small # small, medium, large, huge or the default auto
    spellcheck: false # disable spellcheck
    pretty: true # pretty-print JSON in content file (incompatible with structure fields)
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

### Blocks field

Add Tiptap to your block editor alongside other content blocks:

```yml
# In your page blueprint
fields:
  content:
    type: blocks
    fieldsets:
      - heading
      - text
      - tiptap # Add the Tiptap block
      - image
```

### Frontend/templates

```php
// Basic usage
echo $page->text()->tiptapText();

// With options
echo $page->text()->tiptapText([
  'offsetHeadings' => 1,
  'allowHtml' => true
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

### Custom buttons

The plugin supports custom buttons that can add any attributes to nodes. This allows you to create semantic markup or add styling classes. Configure them in your `config.php`:

```php
return [
  'medienbaecker.tiptap.buttons' => [
    'twoColumn' => [
      'icon' => 'columns',
      'title' => 'Two Columns',
      'nodes' => ['paragraph'],
      'attributes' => [
        'class' => 'two-column'
      ]
    ]
  ]
];
```

Then use them in blueprints just like any other button:

```yaml
tiptap:
  buttons:
    - bold
    - italic
    - "|"
    - twoColumn # Custom button
```

Add corresponding CSS to your frontend and `panel.css` for styling:

```css
.two-column {
	column-count: 2;
	column-gap: 2rem;
}
```

## Ideas for future improvements

- [ ] Kirbytag button? (Fetch all Kirbytags except `link`, `image` and `file`?)
- [ ] [Table button](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [ ] [Snapshot Compare](https://tiptap.dev/blog/release-notes/introducing-snapshot-compare-for-tiptap)?
- [ ] [Blocks replacement](https://templates.tiptap.dev/)?
- [ ] [Forced content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure)?
- [ ] [Real-time collaboration](https://tiptap.dev/product/collaboration)?
