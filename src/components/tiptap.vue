<template>
  <k-field class="k-tiptap-field" data-theme="field" v-bind="$props" :counter="counterOptions">
    <span class="k-input-element">
      <div :data-disabled="disabled" :data-size="size" class="k-input k-tiptap-input">
        <div class="k-tiptap-input-wrapper">
          <toolbar v-if="editor && this.disabled === false" :editor="editor" :label="label" :buttons="buttons" />
          <editor-content :editor="editor" v-model="value" />
        </div>
      </div>
    </span>
  </k-field>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { InvisibleCharacters } from '@tiptap-pro/extension-invisible-characters'
import { Highlights } from './highlights'
import Toolbar from './Toolbar.vue'
import { SoftHyphenCharacter, NonBreakingSpaceCharacter } from './invisibles'
import counter from "@/mixins/forms/counter.js";

export default {
  mixins: [counter],
  computed: {
    counterValue() {
      const plain = this.$helper.string.stripHTML(this.value ?? "");
      return this.$helper.string.unescapeHTML(plain);
    }
  },
  components: { EditorContent, Toolbar },
  props: {
    label: String,
    value: String,
    placeholder: String,
    disabled: Boolean,
    spellcheck: Boolean,
    help: String,
    minlength: Number,
    maxlength: Number,
    size: String,
    buttons: { type: Array, required: true },
    highlights: Array
  },
  data: () => ({
    editor: null
  }),
  mounted() {
    this.editor = new Editor({
      content: this.value,
      onCreate: ({ editor }) => {
        editor.view.dom.setAttribute("spellcheck", this.spellcheck);
      },
      onUpdate: ({ editor }) => this.$emit("input", editor.getHTML()),
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: this.placeholder,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: null, target: null }
        }),
        Highlights.configure({ highlights: this.highlights }),
        InvisibleCharacters.configure({
          builders: [
            new SoftHyphenCharacter(),
            new NonBreakingSpaceCharacter()
          ],
        }),
      ]
    })
  },
  beforeDestroy() {
    this.editor?.destroy()
  }
}

</script>

<style>
.k-tiptap-input-wrapper {
  width: 100%;
}

.tiptap {
  padding: .5rem;
  outline: none;
  width: 100%;
  min-height: 4rem;
  line-height: 1.5rem;
}

:where(.k-tiptap-input):not(:focus-within) {
  --toolbar-text: light-dark(var(--color-gray-300), var(--color-gray-700));
}

:where(.k-tiptap-input):focus-within .k-toolbar {
  position: sticky;
  top: var(--header-sticky-offset);
  inset-inline: 0;
  z-index: 1;
  box-shadow: rgba(0, 0, 0, 0.05) 0 2px 5px;
}

.tiptap {
  min-height: var(--tiptap-size);
}

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

p.is-editor-empty:first-child::before {
  color: var(--input-color-placeholder);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.tiptap :where(p, h1, h2, h3, h4, h5, h6) {
  &:not(:first-child) {
    margin-block-start: 1em;
  }

  &:not(:last-child) {
    margin-block-end: 1em;
  }
}

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

.tiptap a {
  color: var(--link-color);
  text-decoration: underline;
  text-underline-offset: var(--link-underline-offset);
  border-radius: var(--rounded-xs);
  outline-offset: 2px;
}

.tiptap :where(ul, ol) {
  padding-inline-start: 3ch;
}

.tiptap ul {
  list-style-type: disc;
}

.tiptap ol {
  list-style-type: decimal;
}

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

.tiptap .kirbytag {
  color: var(--color-green-900);
  background: var(--color-green-100);
  outline: 1px solid var(--color-green-400);
}

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