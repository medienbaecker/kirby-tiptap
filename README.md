# Kirby Tiptap

A powerful, user-friendly [Tiptap](https://tiptap.dev) field for [Kirby](https://getkirby.com).

![Kirby Tiptap editor with formatting toolbar and example content demonstrating KirbyTags, special character visibility, and the tiptapText() method functionality.](https://github.com/user-attachments/assets/6891c6ea-1c2a-4237-9283-eb78ab6ec778)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Blueprints](#blueprints)
  - [Blocks field](#blocks-field)
  - [Frontend/templates](#frontendtemplates)
  - [Configuration](#configuration)
  - [Keyboard shortcuts](#keyboard-shortcuts)
  - [Extension API](#extension-api)
  - [Customizing HTML output](#customizing-html-output)
  - [Converting existing fields](#converting-existing-fields)
- [Ideas for future improvements](#ideas-for-future-improvements)

## Features

- 🌏 **Best of both worlds:** Uses (and highlights) [KirbyTags](https://getkirby.com/docs/reference/plugins/extensions/kirbytags) for images/links while providing WYSIWYG formatting
- 📦 **Supports all standard Kirby field features** like `required`, `default`, `placeholder`, `counter`, `disabled`, `help`, `size`, `spellcheck` and `minlength`/`maxlength`
- 🤓 **Smart text handling** with intuitive soft hyphen `(-)` and non-breaking space `(_)` replacements, and visible special characters
- 🔧 **Configurable buttons** with customizable heading levels
- 🛼 **Inline mode** for paragraph-free content with buttons being disabled automatically
- 🧠 **One method to rule them all** with `tiptapText()` handling [UUID resolution](https://getkirby.com/docs/reference/templates/field-methods/permalinks-to-urls), [smartypants](https://getkirby.com/docs/reference/system/options/smartypants) and more, plus `tiptapTextInline()` mirroring [`kirbytextInline()`](https://getkirby.com/docs/reference/templates/helpers/kirbytextinline)
- ✨ **Intuitive drag & drop support** for pages and files with intelligent spacing
- 📋 **Smart paste** converts HTML links to KirbyTags automatically
- 👀 **Custom field preview** showing formatted text in structure/object fields
- 🔗 **Improved link and file handling** with dialogs that allow custom fields, automatically pick the right KirbyTag (`(link: )`, `(email: )`, `(file: )` or `(tel: )`) and allow editing existing links/files by pre-filling dialogs
- 🔍 **Cmd+Click navigation** on page/file references to jump directly to the linked page or file in the Panel
- 🌈 **Custom decorations** via the Extension API, e.g. highlighting long words (see `extension-examples/long-words`)
- 🔧 **Optional setting to allow HTML code** so you can paste your ⁠favourite `<script>`, `⁠<marquee>`, or ⁠`<blink>` tag directly
- 🧩 **Extension API** for third-party plugins to add custom buttons, keyboard shortcuts, and full Tiptap extensions
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
    - taskList
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
    inline: true # remove block elements like paragraphs (render with tiptapTextInline())
    counter: false # disable character counter
    format: markdown # store Markdown instead of Tiptap JSON (see below)
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
    files:
      # Filter files shown in the picker (Kirby query)
      query: page.images
      # Add custom fields to the file dialog.
      # Field names must be registered KirbyTag attributes (e.g. caption,
      # alt, class for images) — Kirby ignores unknown attribute names
      # when rendering and folds them into the preceding attribute's value.
      fields:
        caption:
          label: Caption
          type: textarea
    files: page.images # String shorthand for files.query:
    uploads: false # Disable file uploads (default: enabled)
    # Or with options:
    uploads:
      template: image # File blueprint for uploaded files
      parent: site    # Upload destination (any Kirby query)
    uploads: image # String shorthand for uploads.template:
    required: true
    placeholder: My placeholder
    default: My default content
    disabled: true
    help: My help
    maxlength: 10
    minlength: 10
```

#### Markdown format

With `format: markdown` the field stores Markdown instead of Tiptap JSON — the same format a textarea field uses. This makes the field a drop-in replacement for existing textarea fields: change the field type in the blueprint and you're done, no content conversion needed.

```yml
fields:
  text:
    type: tiptap
    format: markdown
```

`tiptapText()` renders Markdown values through Kirby's own `kirbytext()` pipeline (KirbyTags, Markdown, SmartyPants), so templates work unchanged. A Markdown value has nowhere to record the field's `inline: true`, so `inline` fields render with `tiptapTextInline()`.

To switch every tiptap field to Markdown, set the format globally (blueprint values still win):

```php
// site/config/config.php
'medienbaecker.tiptap.format' => 'markdown',
```

##### Choosing a format

Markdown trades fidelity for portability: content files stay readable and usable outside the plugin, but Markdown expresses less than the editor and rendering follows textarea rules.

Stay with `json` for custom nodes, task lists, custom attributes or the `allowHtml`/`offsetHeadings` options. Choose `markdown` for content files you can process elsewhere, or an exact textarea replacement.

|                                         | `json`                        | `markdown`                                     |
| --------------------------------------- | ----------------------------- | ---------------------------------------------- |
| Stored value                            | Tiptap JSON                   | Markdown                                       |
| Rendering                               | Plugin snippets, HTML escaped | `kirbytext()`, HTML passes through             |
| Task lists                              | Yes                           | No (button hidden)                             |
| Custom nodes                            | Yes                           | Stored as JSON until expressible               |
| Custom node attributes                  | Yes                           | Stored as JSON until expressible               |
| Tables                                  | No                            | Raw Markdown in the editor, `markdown.extra` renders it |
| Nested lists                            | Exact                         | Deep nesting can render flat                   |
| `allowHtml`, `offsetHeadings`           | Yes                           | Throw in debug mode                            |

Notes:

- Switching the format converts each field on its next save. To convert a whole site at once, use [the CLI command](#converting-existing-fields).
- Hand-written Markdown is normalized on the first save: `-` bullets, tight lists, `*` emphasis, 2-space nesting. After that the value is stable.
- Content Markdown cannot express is stored as Tiptap JSON and converts back once it becomes expressible. This needs `tiptapText()` — a template calling `kirbytext()` directly would output the raw JSON.
- Markdown without a matching button (a code block when the toolbar has no `codeBlock`, for example) stays raw Markdown in the editor, like tables, and is stored back untouched.
- Labeled Markdown links (`[text](url)`, reference style) become KirbyTags when the field is opened. Bare URLs and autolinks stay as they are.
- Breaks Markdown cannot express (inside headings, consecutive breaks) are stored as literal `<br>`.

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

// Inline, like kirbytextInline()
echo $page->headline()->tiptapTextInline();

// Shorthands
echo $page->text()->tiptap();
echo $page->headline()->tiptapInline();
```

### Configuration

```php
// site/config/config.php
return [

  // Supports https://getkirby.com/docs/reference/system/options/smartypants
  'smartypants' => true,

  // UUID usage for KirbyTags when dragging pages/files
  'medienbaecker.tiptap.uuid' => [
    'pages' => false,  // Use page IDs instead of page://uuid
    'files' => true    // Keep using file://uuid
  ]

  // Or disable UUIDs entirely:
  // 'medienbaecker.tiptap.uuid' => false

];
```

### Keyboard shortcuts

- **Bold**: `Cmd+B` (Mac) / `Ctrl+B` (Windows/Linux)
- **Italic**: `Cmd+I` (Mac) / `Ctrl+I` (Windows/Linux)
- **Strike**: `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows/Linux)
- **Code**: `Cmd+E` (Mac) / `Ctrl+E` (Windows/Linux)
- **Heading 1**: `Cmd+Alt+1` (Mac) / `Ctrl+Alt+1` (Windows/Linux)
- **Heading 2**: `Cmd+Alt+2` (Mac) / `Ctrl+Alt+2` (Windows/Linux)
- **Heading 3**: `Cmd+Alt+3` (Mac) / `Ctrl+Alt+3` (Windows/Linux)
- **Heading 4**: `Cmd+Alt+4` (Mac) / `Ctrl+Alt+4` (Windows/Linux)
- **Heading 5**: `Cmd+Alt+5` (Mac) / `Ctrl+Alt+5` (Windows/Linux)
- **Heading 6**: `Cmd+Alt+6` (Mac) / `Ctrl+Alt+6` (Windows/Linux)
- **Blockquote**: `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Windows/Linux)
- **Code block**: `Cmd+Alt+C` (Mac) / `Ctrl+Alt+C` (Windows/Linux)
- **Bullet list**: `Cmd+Shift+8` (Mac) / `Ctrl+Shift+8` (Windows/Linux)
- **Ordered list**: `Cmd+Shift+7` (Mac) / `Ctrl+Shift+7` (Windows/Linux)

While the above shortcuts all come from [Tiptap's defaults](https://tiptap.dev/docs/editor/core-concepts/keyboard-shortcuts), the following shortcut is also available:

- **Link dialog**: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)

### Extension API

Third-party Kirby plugins can extend the tiptap editor with custom buttons, keyboard shortcuts, and full Tiptap extensions via a window global registry. See the `extension-examples/` folder for working examples.

#### Setup

Every extension plugin needs a minimal `index.php` and an `index.js`:

```php
<?php
// site/plugins/my-extension/index.php
Kirby::plugin('my/extension', []);
```

```js
// site/plugins/my-extension/index.js
(function () {
	window.kirbyTiptap = window.kirbyTiptap || {};
	window.kirbyTiptap.registry = window.kirbyTiptap.registry || {
		extensions: [],
		buttons: [],
		shortcuts: [],
	};

	// Push buttons, shortcuts, or extensions here
})();
```

#### Custom toolbar button

```js
window.kirbyTiptap.registry.buttons.push({
	name: "signature",
	label: "Insert Signature",
	icon: "pen",
	command: ({ editor }) => {
		const name = window.panel?.user?.username || "Author";
		editor
			.chain()
			.focus()
			.insertContent("— " + name)
			.run();
	},
});
```

Then add it to your blueprint:

```yaml
buttons:
  - bold
  - italic
  - signature
```

#### Custom keyboard shortcut

```js
window.kirbyTiptap.registry.shortcuts.push({
	name: "insertHorizontalRule",
	keys: ["Mod-Shift-H"],
	command: ({ editor }) => {
		editor.chain().focus().setHorizontalRule().run();
		return true; // Mark shortcut as handled
	},
});
```

Shortcuts work in all tiptap fields automatically — no blueprint changes needed.

#### Advanced: Full Tiptap extensions

For custom nodes, marks, or ProseMirror plugins, use the factory pattern. Your `create()` function receives kirby-tiptap's bundled Tiptap/ProseMirror modules to avoid duplicate bundle issues:

```js
window.kirbyTiptap.registry.extensions.push({
	name: "wordCount",

	create({ tiptap, pm }) {
		const { Extension } = tiptap.core;
		const { Plugin, PluginKey } = pm.state;

		return Extension.create({
			name: "wordCount",
			addProseMirrorPlugins() {
				return [
					new Plugin({
						key: new PluginKey("wordCount"),
						view() {
							return {
								update(view) {
									const words = view.state.doc.textContent
										.split(/\s+/)
										.filter(Boolean).length;
									console.log("Words:", words);
								},
							};
						},
					}),
				];
			},
		});
	},

	// Optional: co-located toolbar button
	buttons: () => [
		{
			name: "wordCount",
			label: "Word Count",
			icon: "counter",
			command: ({ editor }) => {
				const words = editor.state.doc.textContent
					.split(/\s+/)
					.filter(Boolean).length;
				alert("Words: " + words);
			},
		},
	],
});
```

#### Available modules

The `create()` factory receives these modules:

| Path                              | Module              |
| --------------------------------- | ------------------- |
| `tiptap.core.Extension`           | `@tiptap/core`      |
| `tiptap.core.Node`                | `@tiptap/core`      |
| `tiptap.core.Mark`                | `@tiptap/core`      |
| `tiptap.core.mergeAttributes`     | `@tiptap/core`      |
| `tiptap.vue2.VueNodeViewRenderer` | `@tiptap/vue-2`     |
| `pm.state.Plugin`                 | `prosemirror-state` |
| `pm.state.PluginKey`              | `prosemirror-state` |
| `pm.view.Decoration`              | `prosemirror-view`  |
| `pm.view.DecorationSet`           | `prosemirror-view`  |

#### Button options

| Property      | Type       | Required | Description                                                   |
| ------------- | ---------- | -------- | ------------------------------------------------------------- |
| `name`        | `string`   | Yes      | Unique identifier, used in blueprints                         |
| `label`       | `string`   | Yes      | Tooltip text                                                  |
| `icon`        | `string`   | Yes      | Kirby Panel icon name                                         |
| `command`     | `function` | Yes      | Receives `{ editor }`, runs the action                        |
| `activeCheck` | `function` | No       | Receives `{ editor }`, returns `true` to highlight the button |

#### Important notes

- Extensions must be registered **before** the Panel mounts (push to the registry in your plugin's `index.js`)
- Extension names must be unique — duplicates are skipped with a console warning
- Custom nodes render in the Panel editor but `tiptapText()` won't render them on the frontend unless you add a matching snippet in `site/snippets/tiptap/`

### Customizing HTML output

Override any HTML snippet by creating files in `site/snippets/tiptap/`:

```
site/snippets/tiptap/
├── heading.php      # Customize headings
├── paragraph.php    # Customize paragraphs
├── bold.php         # Customize bold text
├── ...
```

**Available snippets:** `doc`, `paragraph`, `heading`, `bold`, `italic`, `strike`, `code`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`, `taskList`, `taskItem`, `hardBreak`, `text`, `kirbyTag`

**Snippet variables:**

| Variable    | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `$content`  | Pre-rendered children HTML                                   |
| `$attrs`    | Node attributes (e.g., `['level' => 2, 'class' => 'intro']`) |
| `$text`     | Text content (text nodes only)                               |
| `$type`     | Node type                                                    |
| `$next`     | Next sibling node                                            |
| `$previous` | Previous sibling node                                        |
| `$parent`   | Parent node                                                  |

**Example: Headings with anchor links**

```php
<?php // site/snippets/tiptap/heading.php
$level = $attrs['level'] ?? 1;
$id = Str::slug(strip_tags($content));
$htmlAttrs = attr(array_filter(array_diff_key($attrs ?? [], ['level' => true])));
?>
<h<?= $level ?> id="<?= $id ?>"<?= $htmlAttrs ? ' ' . $htmlAttrs : '' ?>><?= $content ?><a href="#<?= $id ?>" class="anchor">#</a></h<?= $level ?>>
```

### Converting existing fields

The `tiptap:convert` CLI command converts stored content to whatever format the blueprint expects:

- `textarea`, `markdown` and `writer` fields (and `tiptap` fields with `format: json` still holding plain text) are converted to Tiptap JSON, so you can switch the field type afterwards
- `tiptap` fields with `format: markdown` that still store JSON are converted to Markdown, including fields inside structure fields and blocks

```bash
kirby tiptap:convert
```

```bash
kirby tiptap:convert --dry-run
```

```bash
kirby tiptap:convert --page blog
```

The Markdown direction renders both representations and reports fields whose frontend output changes with the format switch (bare URLs become links, deep nesting under ordered lists renders flat, both inherent to kirbytext). Fields containing task lists or custom nodes keep their JSON. Models with unsaved Panel changes are skipped entirely, since publishing the draft later would undo the migration.

Back up or commit your content folder before running the command without `--dry-run`.

## Ideas for future improvements

- [ ] [Table button](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [ ] [Snapshot Compare](https://tiptap.dev/blog/release-notes/introducing-snapshot-compare-for-tiptap)?
- [ ] [Blocks replacement](https://templates.tiptap.dev/)?
- [ ] [Forced content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure)?
- [ ] [Real-time collaboration](https://tiptap.dev/product/collaboration)?
