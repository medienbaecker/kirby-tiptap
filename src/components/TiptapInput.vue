<template>
  <div class="k-tiptap-input-wrapper">
    <toolbar v-if="editor && !disabled && allowedButtons.length" v-bind="$props" :editor="editor"
      :buttons="allowedButtons" />
    <editor-content :editor="editor" />
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { InvisibleCharacters } from '@tiptap-pro/extension-invisible-characters'
import { Highlights } from './highlights'
import Toolbar from './Toolbar.vue'
import { SoftHyphenCharacter, NonBreakingSpaceCharacter } from './invisibles'
import { Replacements } from './replacements'
import { ContentSanitizer } from './sanitizer'
import { props } from './props.js'

export default {
  components: { EditorContent, Toolbar },
  props,

  data: () => ({
    editor: null,
    sanitizer: null
  }),

  computed: {
    /**
     * Returns filtered buttons based on inline mode
     * @returns {Array} Filtered buttons array
     */
    allowedButtons() {
      if (!this.inline) {
        return this.buttons;
      }

      const blockElements = ['codeBlock', 'bulletList', 'orderedList', 'image'];

      return this.buttons
        .filter(btn => {
          // Handle headings object specially
          if (typeof btn === 'object' && 'headings' in btn) {
            return false;
          }
          // Handle regular buttons
          return !blockElements.includes(btn);
        })
        .filter((btn, i, arr) => {
          // Remove separators at beginning or end
          return btn !== '|' || (i !== 0 && i !== arr.length - 1);
        });
    },

    /**
     * Returns StarterKit configuration based on allowed buttons
     * @returns {Object} StarterKit configuration
     */
    starterKitConfig() {
      const defaultConfig = {
        dropcursor: {
          width: 2,
          color: 'var(--color-blue-600)'
        }
      };

      const buttonConfigs = {
        heading: btn => typeof btn === 'object' ? 'headings' in btn : btn === 'headings',
        bold: 'bold',
        italic: 'italic',
        strike: 'strike',
        code: 'code',
        codeBlock: 'codeBlock',
        bulletList: 'bulletList',
        orderedList: 'orderedList'
      };

      return Object.entries(buttonConfigs).reduce((config, [feature, buttonName]) => {
        if (typeof buttonName === 'function') {
          config[feature] = this.allowedButtons.some(buttonName);
        } else {
          config[feature] = this.allowedButtons.includes(buttonName);
        }
        return config;
      }, defaultConfig);
    }
  },

  created() {
    this.sanitizer = new ContentSanitizer(this.buttons);
  },

  watch: {
    value: {
      handler(newValue) {
        if (this.editor) {
          const newContent = this.parseContent(newValue);
          const currentContent = this.editor.getJSON();

          if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
            const { from, to } = this.editor.state.selection;
            this.editor.commands.setContent(newContent, false);
            this.editor.commands.setTextSelection({ from, to });
          }
        }
      },
      deep: true
    }
  },

  mounted() {
    this.createEditor()
  },

  beforeDestroy() {
    this.editor?.destroy()
  },

  methods: {
    parseContent(value) {
      try {
        const content = typeof value === 'string' ? JSON.parse(value) : value;
        return this.sanitizer.sanitizeContent(content);
      } catch {
        return value;
      }
    },

    emitContent(editor) {
      if (!editor) {
        this.$emit('input', { json: '' });
        return;
      }

      const content = editor.getJSON();

      if (!content) {
        this.$emit('input', { json: '' });
        return;
      }

      const sanitizedContent = this.sanitizer.sanitizeContent(content);

      if (!sanitizedContent || !sanitizedContent.content) {
        this.$emit('input', { json: '' });
        return;
      }

      const isEmpty = this.isContentEmpty(sanitizedContent);

      const json = isEmpty ? '' : JSON.stringify({
        type: 'doc',
        content: sanitizedContent.content,
        inline: this.inline
      }, null, this.pretty ? 2 : 0);

      this.$emit('input', { json });
    },

    isContentEmpty(sanitizedContent) {
      // Check if content array exists and has items
      if (!Array.isArray(sanitizedContent.content) || sanitizedContent.content.length === 0) {
        return true;
      }

      // If there's only one element
      if (sanitizedContent.content.length === 1) {
        const firstNode = sanitizedContent.content[0];

        // Special handling for headings - they're not empty even without content
        if (firstNode.type === 'heading') {
          return false;
        }

        // Check if element has content array
        if (!Array.isArray(firstNode.content)) {
          return true;
        }

        // Check if content is empty
        return firstNode.content.length === 0;
      }

      return false;
    },

    handlePaste(view, event, slice) {
      const selection = view.state.selection;
      const selectedText = !selection.empty
        ? view.state.doc.textBetween(selection.from, selection.to)
        : '';

      if (selectedText) {
        const pastedText = event.clipboardData.getData('text/plain').trim();
        const urlPattern = /^(https?:\/\/|mailto:|tel:)/i;

        if (urlPattern.test(pastedText)) {
          const kirbyTag = `(link: ${pastedText} text: ${selectedText})`;

          this.editor
            .chain()
            .focus()
            .insertContentAt(selection, kirbyTag)
            .run();

          event.preventDefault();
          return true;
        }
      }
      return false;
    },

    handleTextDrop(coordinates, dragData) {
      const pos = coordinates.pos;
      const prevChar = pos > 0 ? this.editor.state.doc.textBetween(pos - 1, pos) : '';
      const needsSpace = prevChar && prevChar !== ' ';
      const content = needsSpace ? ' ' + dragData : dragData;

      this.editor
        .chain()
        .focus()
        .insertContentAt(pos, content, {
          parseOptions: { preserveWhitespace: true }
        })
        .unsetAllMarks()
        .run();
    },

    handleDrop(view, event, slice, moved) {
      if (!moved && this.$panel.drag.data) {
        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY
        });

        if (this.$panel.drag.type === "text") {
          this.handleTextDrop(coordinates, this.$panel.drag.data);
        } else if (this.$helper.isUploadEvent(event)) {
          alert('File uploads are not possible yet');
        }

        return true;
      }
      return false;
    },

    createEditor() {
      const content = this.parseContent(this.value);

      this.editor = new Editor({
        content,
        extensions: [
          StarterKit.configure(this.starterKitConfig),
          Placeholder.configure({
            placeholder: this.placeholder
          }),
          Highlights.configure({
            kirbytags: this.kirbytags,
            highlights: this.highlights
          }),
          InvisibleCharacters.configure({
            injectCSS: false,
            builders: [
              new SoftHyphenCharacter(),
              new NonBreakingSpaceCharacter()
            ],
          }),
          Replacements
        ],
        editorProps: {
          transformPasted: content => this.sanitizer.sanitizeContent(content),
          handlePaste: this.handlePaste,
          handleDrop: this.handleDrop
        },
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", this.spellcheck);
          this.$emit('editor', editor);
        },
        onUpdate: ({ editor }) => this.emitContent(editor)
      });
    }
  }
};
</script>

<style>
/* Making sure the input fills the whole width  */
.k-tiptap-input-wrapper {
  width: 100%;
}

/* Base styles for the editor */
.tiptap {
  padding: .5rem;
  outline: none;
  width: 100%;
  min-height: var(--tiptap-size);
  line-height: var(--leading-normal);
}

/* Sizes to be configured with the size option */
.k-tiptap-input[data-size="small"] {
  --tiptap-size: 7.5rem;
}

.k-tiptap-input[data-size="medium"] {
  --tiptap-size: 15rem;
}

.k-tiptap-input[data-size="large"] {
  --tiptap-size: 30rem;
}

.k-tiptap-input[data-size="huge"] {
  --tiptap-size: 45rem;
}

/* Placeholder */
p.is-editor-empty:first-child::before {
  color: var(--input-color-placeholder);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Poor man's margin-trim  */
.k-tiptap-input:not([data-inline="true"]) .tiptap>* {
  &:not(:first-child) {
    margin-block-start: calc(1em * var(--leading-normal));
  }

  &:not(:last-child) {
    margin-block-end: calc(var(--text-sm) * var(--leading-normal));
  }
}

/* Headings */
.tiptap h1 {
  font-size: var(--text-h1);
  font-weight: var(--font-h1);
  line-height: var(--leading-h1);
}

.tiptap h2 {
  font-size: var(--text-h2);
  font-weight: var(--font-h2);
  line-height: var(--leading-h2);
}

.tiptap h3 {
  font-size: var(--text-h3);
  font-weight: var(--font-h3);
  line-height: var(--leading-h3);
}

.tiptap h4 {
  font-size: var(--text-h4);
  font-weight: var(--font-h4);
  line-height: var(--leading-h4);
}

.tiptap h5 {
  font-size: var(--text-h5);
  font-weight: var(--font-h5);
  line-height: var(--leading-h5);
}

.tiptap h6 {
  font-size: var(--text-h6);
  font-weight: var(--font-h6);
  line-height: var(--leading-h6);
}

/* Links */
.tiptap a {
  color: var(--link-color);
  text-decoration: underline;
  text-underline-offset: var(--link-underline-offset);
  border-radius: var(--rounded-xs);
  outline-offset: 2px;
}

/* Lists */
.tiptap :where(ul, ol) {
  padding-inline-start: 3ch;
}

.tiptap ul {
  list-style-type: disc;
}

.tiptap ol {
  list-style-type: decimal;
}

/* Code */
.tiptap code {
  padding: var(--spacing-1);
  font-size: var(--code-inline-font-size);
  font-family: var(--code-font-family);
  color: var(--code-inline-color-text);
  background: var(--code-inline-color-back);
  border-radius: var(--rounded);
  outline: 1px solid var(--code-inline-color-border);
  outline-offset: -1px;
}

.tiptap pre code {
  display: block;
}

/* Kirbytags */
.tiptap .kirbytag {
  margin: calc(.1em * -1);
  padding: .1em;
  border-radius: var(--rounded);
  color: var(--color-yellow-900);
  background: var(--color-yellow-200);
}

/* Invisible characters */
.Tiptap-invisible-character {
  display: inline-block;
  position: relative;
  opacity: .33;
}

.Tiptap-invisible-character--soft-hyphen {
  width: 1px;
  height: 1lh;
  background-color: currentColor;
  vertical-align: top;
}

.Tiptap-invisible-character--non-breaking-space {
  vertical-align: baseline;
}

.Tiptap-invisible-character--non-breaking-space::before {
  content: ' ';
  position: absolute;
  height: 1px;
  background-color: currentColor;
}
</style>