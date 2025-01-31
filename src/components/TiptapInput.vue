<template>
  <div class="k-tiptap-input-wrapper">
    <toolbar v-if="editor && !disabled" :editor="editor" :label="label" :buttons="buttons" />
    <editor-content :editor="editor" v-model="value" />
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
import { props } from './props.js'

export default {
  components: { EditorContent, Toolbar },
  props,
  data: () => ({
    editor: null
  }),
  mounted() {
    this.createEditor()
  },
  beforeDestroy() {
    this.editor?.destroy()
  },
  methods: {
    createEditor() {
      this.editor = new Editor({
        content: this.value,
        extensions: [
          StarterKit, /* Provides basic editor functionality (bold, italic, etc.) */
          Placeholder.configure({ placeholder: this.placeholder }), /* Adds placeholder text from blueprint */
          Highlights.configure({ highlights: this.highlights }), /* Custom highlight functionality */
          InvisibleCharacters.configure({
            builders: [
              new SoftHyphenCharacter(),
              new NonBreakingSpaceCharacter()
            ],
          }),
        ],
        onCreate: ({ editor }) => {
          /* Set spellcheck attribute after editor creation */
          editor.view.dom.setAttribute("spellcheck", this.spellcheck);
        },
        onUpdate: ({ editor }) => this.$emit("input", editor.getHTML()), /* Emit changes to parent */
      })
    }
  }
}
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
  line-height: 1.5rem;
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
.tiptap :where(p, h1, h2, h3, h4, h5, h6) {
  &:not(:first-child) {
    margin-block-start: 1em;
  }

  &:not(:last-child) {
    margin-block-end: 1em;
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

/* Code/Kirbytags */
.tiptap code,
.tiptap .kirbytag {
  padding: var(--spacing-1);
  font-size: var(--code-inline-font-size);
  font-family: var(--code-font-family);
  color: var(--code-inline-color-text);
  background: var(--code-inline-color-back);
  border-radius: var(--rounded);
  outline: 1px solid var(--code-inline-color-border);
  outline-offset: -1px;
}

/* Special colors for Kirbytags */
.tiptap .kirbytag {
  color: var(--color-green-900);
  background: var(--color-green-100);
  outline: 1px solid var(--color-green-400);
}

/* Invisible characters */
.Tiptap-invisible-character--soft-hyphen::before {
  content: '';
  height: 1.25lh;
  vertical-align: text-top;
  border-inline-end: 1px solid currentColor;
  margin-inline: .5px;
}

.Tiptap-invisible-character--non-breaking-space::before {
  content: 'ˍ';
}
</style>