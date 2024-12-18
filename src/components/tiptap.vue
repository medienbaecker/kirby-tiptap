<template>
  <k-field class="k-tiptap-field" data-theme="field" :label="label">
    <span class="k-input-element">
      <div data-theme="field" class="k-input k-textarea-input">
        <div class="k-textarea-input-wrapper">
          <toolbar v-if="editor" :editor="editor" :label="label" :buttons="buttons" />
          <editor-content :editor="editor" v-model="value" />
        </div>
      </div>
    </span>
  </k-field>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Kirbytag } from './kirbytag'
import Toolbar from './Toolbar.vue'

export default {
  components: {
    EditorContent,
    Toolbar,
  },

  props: {
    label: String,
    value: String,
    buttons: {
      type: Array,
      required: true
    }
  },

  data() {
    return {
      editor: null,
    }
  },

  mounted() {
    this.editor = new Editor({
      content: this.value,
      onUpdate: ({ editor }) => {
        this.$emit("input", editor.getHTML());
      },
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: null,
            target: null,
          },
        }),
        Kirbytag,
      ],
    });
  },

  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  }
}
</script>

<style>
.k-tiptap-field {
  .k-textarea-input-wrapper {
    width: 100%;
  }
}

.tiptap {
  padding: .5rem;
  outline: none;
  width: 100%;
  min-height: 4rem;
  line-height: 1.5rem;
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

.tiptap code {
  padding: var(--spacing-1);
  font-size: var(--code-inline-font-size);
  color: var(--code-inline-color-text);
  background: var(--code-inline-color-back);
  border-radius: var(--rounded);
  outline: 1px solid var(--code-inline-color-border);
  outline-offset: -1px;
}

.tiptap .kirbytag {
  background-color: hsl(var(--color-green-h), var(--color-green-s), 90%);
  color: hsl(var(--color-green-h), var(--color-green-s), 10%);
  border-radius: var(--rounded);
  padding: 2px 4px;
}
</style>