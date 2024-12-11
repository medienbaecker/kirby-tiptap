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
      default: () => ['bold', 'italic', 'strike', 'code', '|', 'link', '|', 'bulletList', 'orderedList']
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
          rel: null,
          target: null,
        }),
      ],
    });
  },

}
</script>

<style>
.ProseMirror {
  padding: .5rem;
  outline: none;
  width: 100%;
  min-height: 4rem;
  line-height: 1.5rem;
}

.k-textarea-input-wrapper {
  width: 100%;
}

ul {
  padding-left: 1.25rem;
}

ul li {
  list-style: disc;
}

ol {
  padding-left: 1.25rem;
}

ol li {
  list-style: decimal;
}

a {
  color: var(--link-color);
  text-decoration: underline;
  text-underline-offset: var(--link-underline-offset);
  border-radius: var(--rounded-xs);
  outline-offset: 2px;
}
</style>